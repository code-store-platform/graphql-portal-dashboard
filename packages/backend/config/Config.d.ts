/* tslint:disable */
/* eslint-disable */
declare module 'node-config-ts' {
  interface IConfig {
    name: string;
    application: Application;
    gateway: Gateway;
    client: Client;
    db: Db;
  }
  interface Db {
    redis: Redis;
    mongodb: Mongodb;
  }
  interface Mongodb {
    connectionString: string;
  }
  interface Redis {
    connectionString: string;
    clusterNodes: string;
  }
  interface Client {
    host: string;
  }
  interface Gateway {
    secret: string;
  }
  interface Application {
    env: string;
    host: string;
    publicHost: string;
    port: number;
    useSwaggerUi: boolean;
    graphQL: GraphQL;
    serveStatic: boolean;
    logLevel: string;
    cryptoSecret: string;
    jwtSecret: string;
    salt: string;
    defaultAdmin: DefaultAdmin;
    metrics: Metrics;
    mail: Mail;
    maxmind: Maxmind;
  }
  interface Maxmind {
    dbPath: string;
    licenseKey: string;
    accountId: string;
  }
  interface Mail {
    driver: string;
    from: string;
    sendgrid: Sendgrid;
    smtp: Smtp;
  }
  interface Smtp {
    host: string;
    port: number;
    auth: Auth;
    secure: boolean;
  }
  interface Auth {
    user: string;
    pass: string;
  }
  interface Sendgrid {
    apiKey: string;
  }
  interface Metrics {
    enabled: boolean;
    chunk: number;
    delay: number;
  }
  interface DefaultAdmin {
    email: string;
    password: string;
  }
  interface GraphQL {
    playground: boolean;
    debug: boolean;
  }
  export const config: Config;
  export type Config = IConfig;
}
