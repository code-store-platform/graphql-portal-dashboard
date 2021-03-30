import { MetricsChannels } from '@graphql-portal/types';
import {
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoose';
import { config } from 'node-config-ts';
import {
  LocationRecord,
  Reader,
  ReaderModel,
  WebServiceClient,
} from '@maxmind/geoip2-node';
import {
  add,
  addDays,
  addHours,
  addMinutes,
  differenceInSeconds,
  endOfDay,
  startOfHour,
  startOfMinute,
  subDays,
  subHours,
} from 'date-fns';
import Provider from '../../common/enum/provider.enum';
import { LoggerService } from '../../common/logger';
import { INetworkMetricDocument } from '../../data/schema/network-metric.schema';
import { IRequestMetricDocument } from '../../data/schema/request-metric.schema';
import ApiDefService from '../api-def/api-def.service';

import {
  AnyMetric,
  AnyResolverMetric,
  IGotError,
  IGotRequest,
  ISentResponse,
  IReducedResolver,
  IMatch,
  IAggregateFilters,
  IApiActivity,
  IMetric,
  IMetricFilter,
  IAPIMetric,
} from './interfaces';
import { IApiDefDocument } from '../../data/schema/api-def.schema';
import { RedisClient } from '../../common/types';

type MetricScale = 'hour' | 'day' | 'week' | 'month';

@Injectable()
export default class MetricService implements OnModuleInit, OnModuleDestroy {
  private redis: RedisClient;
  private maxmind: ReaderModel | WebServiceClient | void;
  private intervals: NodeJS.Timer[] = [];

  public constructor(
    @Inject(Provider.REDIS)
    private readonly redisClients: [RedisClient, RedisClient],
    @Inject(forwardRef(() => ApiDefService))
    private readonly apiDefService: ApiDefService,
    @InjectModel('RequestMetric')
    private requestMetricModel: Model<IRequestMetricDocument>,
    @InjectModel('NetworkMetric')
    private networkMetricModel: Model<INetworkMetricDocument>,
    private readonly logger: LoggerService
  ) {
    [this.redis] = this.redisClients;
  }

  public async onModuleInit(): Promise<void> {
    await this.setMaxmindClient();
    this.init();
  }

  public async onModuleDestroy(): Promise<void> {
    this.intervals.forEach((interval) => clearInterval(interval));
  }

  public init(): void {
    const {
      enabled = true,
      chunk = 100,
      delay = 5000,
    } = config.application.metrics;

    if (!enabled) return;

    if (this.intervals.length) {
      this.intervals.forEach(clearInterval);
      this.intervals = [];
    }

    this.intervals.push(
      setInterval(
        this.fetchMetrics.bind(this, MetricsChannels.REQUEST_IDS, chunk),
        delay
      )
    );
    this.intervals.push(
      setInterval(
        this.fetchMetrics.bind(this, MetricsChannels.NETWORK, chunk),
        delay
      )
    );
  }

  private async fetchMetrics(
    channel: MetricsChannels.REQUEST_IDS | MetricsChannels.NETWORK,
    chunk: number
  ): Promise<void> {
    const aggregateFunction = {
      [MetricsChannels.NETWORK]: this.aggregateNetworkMetric.bind(this),
      [MetricsChannels.REQUEST_IDS]: this.aggregateRequestMetric.bind(this),
    }[channel];

    try {
      const records = await this.getRecords(channel, chunk);
      if (!records.length) return;

      await Promise.all(records.map(async (r) => aggregateFunction(r)));
    } catch (error) {
      this.logger.error(
        error,
        null,
        `${this.constructor.name}:${this.fetchMetrics.name}`,
        { channel, chunk }
      );
    }
  }

  public async getApiActivity(
    filters: IAggregateFilters
  ): Promise<IApiActivity[]> {
    const aggregationQuery = [
      { $match: this.makeMatchFromFilters(filters) },
      {
        $lookup: {
          from: 'apidefs',
          localField: 'apiDef',
          foreignField: '_id',
          as: 'apiNames',
        },
      },
      { $unwind: '$apiDef' },
      {
        $facet: {
          latency: [
            { $group: { _id: '$apiDef', value: { $avg: '$latency' } } },
          ],
          count: [{ $group: { _id: '$apiDef', value: { $sum: 1 } } }],
          failed: [
            {
              $match: {
                $or: [
                  { 'resolvers.errorAt': { $exists: true } },
                  { error: { $not: { $eq: null } } },
                ],
              },
            },
            { $group: { _id: '$apiDef', value: { $sum: 1 } } },
          ],
          success: [
            {
              $match: {
                $and: [
                  { 'resolvers.errorAt': { $exists: false } },
                  { error: { $eq: null } },
                ],
              },
            },
            { $group: { _id: '$apiDef', value: { $sum: 1 } } },
          ],
          lastAccess: [
            { $group: { _id: '$apiDef', value: { $last: '$requestDate' } } },
          ],
          apiName: [
            {
              $group: {
                _id: '$apiDef',
                value: { $first: { $arrayElemAt: ['$apiNames.name', 0] } },
              },
            },
          ],
        },
      },
    ];

    const [aggregationResult] = await this.requestMetricModel.aggregate(
      aggregationQuery
    );
    const result = Object.entries(aggregationResult).reduce(
      (acc, [key, apiDefs]: [string, { _id: string; value: number }[]]) => {
        apiDefs.forEach(({ _id, value }: any) => {
          const api = acc[_id] || (acc[_id] = {});
          api[key] = value;
        });
        return acc;
      },
      {} as any
    );

    return Object.entries(result).map(
      ([apiDef, values]: [string, Record<string, unknown>]) => ({
        failed: 0,
        success: 0,
        latency: 0,
        count: 0,
        lastAccess: '',
        apiName: '',
        apiDef,
        ...values,
      })
    );
  }

  public async aggregateMetrics(
    scale: MetricScale,
    filters: IAggregateFilters
  ): Promise<IMetric> {
    const boundaries = this.getBoundaries(
      filters.startDate,
      filters.endDate,
      scale
    );
    const aggregationQuery = [
      { $match: this.makeMatchFromFilters(filters) },
      {
        $facet: {
          latency: [
            {
              $bucket: {
                groupBy: '$requestDate',
                default: new Date(filters.endDate),
                boundaries,
                output: { latency: { $avg: '$latency' }, count: { $sum: 1 } },
              },
            },
          ],
          countries: [
            {
              $group: {
                _id: '$geo.country',
                count: { $sum: 1 },
              },
            },
          ],
          failures: [
            {
              $match: {
                $or: [
                  { 'resolvers.errorAt': { $exists: true } },
                  { error: { $not: { $eq: null } } },
                ],
              },
            },
            {
              $bucket: {
                groupBy: '$resolvers.errorAt',
                default: new Date(filters.endDate),
                boundaries,
                output: { count: { $sum: 1 } },
              },
            },
          ],
          successes: [
            {
              $match: {
                $and: [
                  { 'resolvers.errorAt': { $exists: false } },
                  { error: { $eq: null } },
                ],
              },
            },
            {
              $bucket: {
                groupBy: '$requestDate',
                default: new Date(filters.endDate),
                boundaries,
                output: { count: { $sum: 1 } },
              },
            },
          ],
        },
      },
    ];
    const [aggregationResult] = await this.requestMetricModel.aggregate(
      aggregationQuery
    );
    const makeMapFn = (p: any, c: any): Record<string, any> => {
      p[c._id.toISOString()] = c;
      return p;
    };
    const requestMap = aggregationResult.latency.reduce(makeMapFn, {});
    const successMap = aggregationResult.successes.reduce(makeMapFn, {});
    const failureMap = aggregationResult.failures.reduce(makeMapFn, {});
    const requestData = boundaries.map((b) => {
      const key = b.toISOString();
      const data = { _id: key, latency: 0, count: 0 };

      if (requestMap[key]) data.latency = requestMap[key].latency;
      if (requestMap[key]) data.count = requestMap[key].count;

      return data;
    });
    const failureData = boundaries.map((b) => {
      const key = b.toISOString();
      const data = { _id: key, failure: 0, success: 0 };

      if (failureMap[key]) data.failure = failureMap[key].count;
      if (successMap[key]) data.success = successMap[key].count;

      return data;
    });

    return {
      latency: requestData.map((obj) => ({
        argument: obj._id,
        value: obj.latency,
      })),
      count: requestData.map((obj) => ({
        argument: obj._id,
        value: obj.count,
      })),
      countries: aggregationResult.countries.map(
        (obj: { _id: string; count: number }) => ({
          argument: obj._id || 'Other',
          value: obj.count,
        })
      ),
      failures: failureData.map((obj) => ({
        argument: obj._id,
        failure: obj.failure,
        success: obj.success,
      })),
    };
  }

  /**
   * Gets RequestMetrics split into date chunks.
   *
   * @param chunks
   * @param filters
   */
  public async getChunkedAPIMetrics(
    chunks: Date[],
    filters: IMetricFilter
  ): Promise<IAPIMetric[]> {
    this.logger.debug(
      `getChunkedAPIMetrics with startDate: ${chunks[0]}, endDate: ${
        chunks[chunks.length - 1]
      }, filters: ${JSON.stringify(filters)}`,
      this.constructor.name
    );

    const boundaries = chunks.map((v) => new Date(v));

    // FIXME: default should not be Other
    const aggregationQuery = [
      {
        $match: {
          $and: [
            this.makeMatchFromFilters({
              ...filters,
              startDate: chunks[0],
              endDate: chunks[chunks.length - 1],
            }),
            { latency: { $ne: null } },
          ],
        },
      },
      {
        $facet: {
          // Average Latency
          latency: [
            // filter out documents without latency field
            // { $match: { latency: { $ne: null } } },
            {
              $bucket: {
                groupBy: '$requestDate',
                default: 'Other',
                boundaries,
                output: { latency: { $avg: '$latency' }, count: { $sum: 1 } },
              },
            },
          ],
          // Count of successful requests
          successes: [
            {
              $match: {
                $and: [
                  { 'resolvers.errorAt': { $exists: false } },
                  { error: { $eq: null } },
                ],
              },
            },
            {
              $bucket: {
                groupBy: '$requestDate',
                default: 'Other',
                boundaries,
                output: { count: { $sum: 1 } },
              },
            },
          ],
          // Count of failed requests
          failures: [
            {
              $match: {
                $or: [
                  { 'resolvers.errorAt': { $exists: true } },
                  { error: { $not: { $eq: null } } },
                ],
              },
            },
            {
              $bucket: {
                groupBy: '$resolvers.errorAt',
                default: 'Other',
                boundaries,
                output: { count: { $sum: 1 } },
              },
            },
          ],
          // Per-country metrics
          countries: [
            {
              $match: { 'geo.country': { $ne: null } },
            },
            {
              $group: {
                _id: '$geo.country',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];

    const [aggregationResult] = await this.requestMetricModel.aggregate(
      aggregationQuery
    );

    const aggregateToHashMap = (
      accumulator: Record<string, any>,
      curr: any
    ): Record<string, any> => {
      accumulator[curr._id.toISOString()] = curr;
      return accumulator;
    };

    // Convert results into HashMaps and then map the results
    // to the incoming chunks
    const latencyMap = aggregationResult.latency.reduce(aggregateToHashMap, {});
    const sucessesMap = aggregationResult.successes.reduce(
      aggregateToHashMap,
      {}
    );
    const failuresMap = aggregationResult.failures.reduce(
      aggregateToHashMap,
      {}
    );

    // Map to chunks
    const result: IAPIMetric[] = chunks.map((c) => {
      const date = new Date(c);
      const metric: IAPIMetric = {
        chunk: date,
        avgLatency: 0,
        count: 0,
        failures: 0,
        successes: 0,
      };

      const key = date.toISOString();
      if (latencyMap[key]) {
        metric.avgLatency = latencyMap[key].latency;
        metric.count = latencyMap[key].count;
      }

      if (sucessesMap[key]) metric.successes = sucessesMap[key].count;
      if (failuresMap[key]) metric.failures = failuresMap[key].count;

      return metric;
    });

    this.logger.debug(
      `result: ${JSON.stringify(result)}`,
      this.constructor.name
    );

    return result;
  }

  public async removeForApiDef(apiDefId: string): Promise<boolean> {
    this.logger.debug(
      `Removing metrics for apiDef: ${apiDefId}`,
      this.constructor.name
    );
    const deleted = await this.requestMetricModel.deleteMany({
      apiDef: apiDefId,
    });

    return Boolean(deleted?.ok);
  }

  private async getRecords(
    channel: MetricsChannels.REQUEST_IDS | MetricsChannels.NETWORK,
    chunk: number
  ): Promise<string[]> {
    const [[error, records]] = await this.redis
      .multi()
      .lrange(channel, 0, chunk)
      .ltrim(channel, chunk + 1, -1)
      .exec();

    if (error) throw error;

    return records;
  }

  private async aggregateRequestMetric(requestId: string): Promise<void> {
    const rawData: AnyMetric[] = (
      await this.redis.lrange(requestId, 0, -1)
    ).map((s) => JSON.parse(s));
    await this.redis.ltrim(requestId, rawData.length, -1);

    const gotRequest: IGotRequest | undefined = rawData.find(
      ({ event }) => event === MetricsChannels.GOT_REQUEST
    ) as any;
    if (/IntrospectionQuery/.test(gotRequest?.query?.query as string)) return;

    const gotError: IGotError | undefined = rawData.find(
      ({ event }) => event === MetricsChannels.GOT_ERROR
    ) as any;
    const sentResponse: ISentResponse | undefined = rawData.find(
      ({ event }) => event === MetricsChannels.SENT_RESPONSE
    ) as any;

    // todo get endpoint from gotRequest.context
    const api = await this.apiDefService.findByEndpoint(
      gotRequest?.request.baseUrl
    );

    if (!api)
      this.logger.warn(
        'Api with such endpoint was not found',
        `${this.constructor.name}:${this.aggregateRequestMetric.name}`,
        { requestId, endpoint: gotRequest?.request.baseUrl }
      );

    const resolvers = this.reduceResolvers(
      api,
      rawData.filter(this.isResolverMetric) as AnyResolverMetric[]
    );

    const latency =
      sentResponse && gotRequest
        ? sentResponse.date - gotRequest.date
        : undefined;

    await this.requestMetricModel.create({
      apiDef: api?._id,
      user: api?.user._id,
      requestId,
      resolvers,
      latency,
      nodeId: gotRequest?.nodeId,
      query:
        gotRequest?.query instanceof Object
          ? gotRequest.query
          : { query: '', variables: null },
      userAgent: gotRequest?.userAgent,
      ip: gotRequest?.ip,
      geo: await this.getGeoData(gotRequest?.ip),
      request: gotRequest?.request,
      rawResponseBody: sentResponse?.rawResponseBody,
      contentLength: sentResponse?.contentLength,
      error: gotError?.error || null,
      requestDate: gotRequest?.date,
      responseDate: sentResponse?.date,
    });
  }

  private async aggregateNetworkMetric(record: string): Promise<void> {
    const { date, network, nodeId } = JSON.parse(record);

    await this.networkMetricModel.create({ date, ...network, nodeId });
  }

  private reduceResolvers(
    apiDef: IApiDefDocument | null,
    rawData: AnyResolverMetric[]
  ): IReducedResolver[] {
    const resolvers = rawData.reduce(
      (acc: any, resolverData: AnyResolverMetric) => {
        const { path } = resolverData;

        if (!acc[path]) {
          acc[path] = {};
        }

        acc[path] = {
          ...acc[path],
          ...this.transformResolverData(resolverData),
        };

        const resolver = acc[path];

        const doneAt = resolver.doneAt || resolver.errorAt;
        const calledAt = resolver.calledAt;
        if (calledAt && doneAt && !resolver.latency) {
          resolver.latency = doneAt - calledAt;
        }

        if (apiDef && !resolver.sourceId && resolver.source) {
          resolver.sourceId = apiDef.sources.find(
            ({ name }) => name === resolver.source
          )?._id;
        }

        return acc;
      },
      {}
    );

    return Object.values(resolvers);
  }

  private transformResolverData(
    data: AnyResolverMetric
  ): Partial<IReducedResolver> {
    switch (data.event) {
      case MetricsChannels.RESOLVER_CALLED:
        return {
          path: data.path,
          source: data.source,
          info: data.info,
          args: data.args,
          calledAt: data.date,
        };
      case MetricsChannels.RESOLVER_DONE:
        return {
          doneAt: data.date,
          result: data.result,
        };
      case MetricsChannels.RESOLVER_ERROR:
        return {
          errorAt: data.date,
          error: data.error,
        };
      default:
        return {};
    }
  }

  private isResolverMetric(metric: AnyMetric): boolean {
    return [
      MetricsChannels.RESOLVER_CALLED,
      MetricsChannels.RESOLVER_DONE,
      MetricsChannels.RESOLVER_ERROR,
    ].includes(metric.event);
  }

  private async setMaxmindClient(): Promise<void> {
    const context = `${this.constructor.name}:${this.setMaxmindClient.name}`;
    const { dbPath, accountId, licenseKey } = config.application.maxmind;
    if (dbPath) {
      this.logger.debug('Maxmind uses local db', context, { dbPath });
      this.maxmind = await Reader.open(dbPath).catch((error) => {
        this.logger.error(error, null, context, { dbPath });
      });
    } else if (accountId && licenseKey) {
      this.logger.debug('Maxmind uses web service client', context, {
        accountId,
        licenseKey,
      });
      this.maxmind = new WebServiceClient(accountId, licenseKey);
    } else {
      this.logger.debug(
        'Maxmind is not used, request-metrics will not have geo data',
        context
      );
    }
  }

  private async getGeoData(
    ip: string | undefined
  ): Promise<
    | {
        city: string | undefined;
        location: LocationRecord | undefined;
        country: string | undefined;
      }
    | Record<string, never>
  > {
    if (!ip || !this.maxmind) return {};
    const context = `${this.constructor.name}:${this.getGeoData.name}`;

    try {
      const { city, location } = await this.maxmind.city(ip);
      const { country } = await this.maxmind.country(ip);
      this.logger.debug(`Looking for geo data for ip: ${ip}`, context);
      return {
        city: city?.names.en,
        country: country?.names.en,
        location,
      };
    } catch (error) {
      this.logger.error(error, null, context);
      return {};
    }
  }

  private getBoundaries(
    startDate: Date | number,
    endDate: Date | number,
    scale: MetricScale
  ): Date[] {
    const boundaries: Date[] = [];
    let sdate = new Date(startDate);
    endDate = new Date(endDate);
    const next = (): boolean => {
      sdate = add(sdate, { [`${scale}s`]: 1 });
      return differenceInSeconds(sdate, endDate) <= 0;
    };

    do {
      boundaries.push(sdate);
    } while (next());

    // this.logger.debug(
    //   `boundaries ${JSON.stringify(boundaries)}`,
    //   this.constructor.name
    // );
    return boundaries;
  }

  private makeMatchFromFilters(filters: IAggregateFilters): IMatch {
    const match: IMatch = {
      requestDate: {},
    };
    const filterToFunction = {
      startDate: (value: Date | number): void => {
        match.requestDate.$gte = new Date(value);
      },
      endDate: (value: Date | number): void => {
        match.requestDate.$lte = new Date(value);
      },
      sourceId: (value: string): void => {
        match['resolvers.sourceId'] = new ObjectId(value);
      },
      apiDef: (value: string): void => {
        match.apiDef = new ObjectId(value);
      },
      user: (value: string): void => {
        match.user = new ObjectId(value);
      },
    };
    Object.entries(filters).forEach(
      ([key, value]: [keyof IAggregateFilters, any]) => {
        if (filterToFunction[key] && value) {
          filterToFunction[key](value);
        }
      }
    );
    return match;
  }
}
