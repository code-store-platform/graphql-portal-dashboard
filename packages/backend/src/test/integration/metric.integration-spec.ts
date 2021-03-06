import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'node-config-ts';
import supertest from 'supertest';
import HeadersEnum from '../../common/enum/headers.enum';
import Roles from '../../common/enum/roles.enum';
import IUser from '../../common/interface/user.interface';
import LoggerService from '../../common/logger/logger.service';
import AppModule from '../../modules/app.module';
import MetricService from '../../modules/metric/metric.service';
import ITokens from '../../modules/user/interfaces/tokens.interface';
import UserService from '../../modules/user/user.service';
import { createUser, Method, requestTo, RequestToResult } from '../common';
import {
  IAggregateFilters,
  IMetricFilter,
} from '../../modules/metric/interfaces';

jest.mock('ioredis');

describe('MetricResolver', () => {
  let request: RequestToResult;
  let app: INestApplication;
  let metricService: MetricService;
  let userService: UserService;
  let user: IUser & ITokens;
  let admin: IUser & ITokens;
  const date = +new Date();

  const metricFilters: IMetricFilter = {
    apiDef: 'apiDef',
    sourceId: 'sourceId',
  };

  const aggregateFilters: IAggregateFilters = {
    apiDef: 'apiDef',
    sourceId: 'sourceId',
    startDate: date,
    endDate: date,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MetricService)
      .useValue({
        getApiActivity: jest.fn().mockImplementation(() => {}),
        getChunkedAPIMetrics: jest.fn().mockImplementation(() => {}),
        getCountryMetrics: jest.fn().mockImplementation(() => {}),
        getSlowestRequests: jest.fn().mockImplementation(() => {}),
        getApiAndSourcesLatencies: jest.fn().mockImplementation(() => {}),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(new LoggerService(config));
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    request = requestTo(app);
    metricService = app.get<MetricService>(MetricService);
    userService = app.get<UserService>(UserService);

    user = await createUser(userService);
    admin = await createUser(userService, Roles.ADMIN);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.clearAllMocks());

  describe('GraphQL', () => {
    let graphQlRequest: (
      query: string,
      variables?: any,
      headers?: any
    ) => supertest.Test;

    beforeAll(() => {
      graphQlRequest = (
        query: string,
        variables = {},
        headers = { [HeadersEnum.AUTHORIZATION]: user.accessToken }
      ): supertest.Test =>
        request(Method.post, '/graphql')
          .set(headers)
          .send({ query, variables });
    });

    describe('getApiActivity', () => {
      it('should call getApiActivity', async () => {
        const date = new Date().toString();
        await graphQlRequest(
          `query getApiActivity($filters: MetricAggregateFilters!) {
            getApiActivity(filters: $filters) {
              apiName
              apiDef
              count
              success
              failed
              latency
              lastAccess
            }
          }`,
          {
            filters: {
              startDate: date,
              endDate: date,
            },
          }
        ).expect(HttpStatus.OK);

        expect(metricService.getApiActivity).toHaveBeenCalledTimes(1);
        expect(metricService.getApiActivity).toHaveBeenCalledWith({
          startDate: date,
          endDate: date,
          user: user._id,
        });
      });
    });

    describe('getSlowestRequests', () => {
      it('should call getSlowestRequests', async () => {
        await graphQlRequest(
          `query getSlowestRequests($filters: MetricAggregateFilters!) {
            getSlowestRequests(filters: $filters) {
              query
              apiName
              latency
            }
          }`,
          {
            filters: aggregateFilters,
          }
        ).expect(HttpStatus.OK);

        expect(metricService.getSlowestRequests).toHaveBeenCalledTimes(1);
        expect(metricService.getSlowestRequests).toHaveBeenCalledWith(
          aggregateFilters
        );
      });
    });

    describe('getChunkedAPIMetrics', () => {
      const chunks = [new Date().toString(), new Date().toString()];

      it('should call getChunkedAPIMetrics', async () => {
        await graphQlRequest(
          `query getChunkedAPIMetrics($chunks: [Timestamp], $filters: MetricFilter!) {
            getChunkedAPIMetrics(chunks: $chunks, filters: $filters) {
              count
            }
          }`,
          {
            chunks,
            filters: metricFilters,
          }
        ).expect(HttpStatus.OK);

        expect(metricService.getChunkedAPIMetrics).toHaveBeenCalledTimes(1);
        expect(metricService.getChunkedAPIMetrics).toHaveBeenCalledWith(
          chunks,
          { ...metricFilters, user: user._id }
        );
      });
    });

    describe('getApiAndSourcesLatencies', () => {
      const chunks = [new Date().toString(), new Date().toString()];

      it('should call getApiAndSourcesLatencies', async () => {
        await graphQlRequest(
          `query getApiAndSourcesLatencies($chunks: [Timestamp], $filters: MetricFilter!) {
            getApiAndSourcesLatencies(chunks: $chunks, filters: $filters)
          }`,
          {
            chunks,
            filters: metricFilters,
          }
        ).expect(HttpStatus.OK);

        expect(metricService.getApiAndSourcesLatencies).toHaveBeenCalledTimes(
          1
        );
        expect(metricService.getApiAndSourcesLatencies).toHaveBeenCalledWith(
          chunks,
          { ...metricFilters, user: user._id }
        );
      });
    });

    describe('getCountryMetrics', () => {
      it('should call getCountryMetrics', async () => {
        const startDate = +new Date();
        const endDate = startDate;

        await graphQlRequest(
          `query getCountryMetrics($filters: MetricAggregateFilters!, $limit: Int) {
            getCountryMetrics(filters: $filters, limit: $limit) {
              count
            }
          }`,
          {
            filters: aggregateFilters,
          }
        ).expect(HttpStatus.OK);

        expect(metricService.getCountryMetrics).toHaveBeenCalledTimes(1);
        expect(metricService.getCountryMetrics).toHaveBeenCalledWith(
          { ...aggregateFilters, user: user._id },
          undefined
        );
      });
    });
  });
});
