import { GenericContainer, StartedTestContainer, StoppedTestContainer } from 'testcontainers';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { RestartOptions } from 'testcontainers/dist/test-container';

const POSTGRES_PORT = 5432;

type Port = number;
type Labels = { [key: string]: string };
type Id = string;
type Host = string;
type ContainerName = string;
type StreamOutput = string;
type ExitCode = number;
type Command = string;
type ExecResult = { output: StreamOutput; exitCode: ExitCode };

interface StopOptions {
    timeout: number;
    removeVolumes: boolean;
}

export class PostgisContainer extends GenericContainer {
    private database = 'test';
    private username = randomUUID();
    private password = randomUUID();

    constructor(image = 'postgis/postgis:11-3.2-alpine') {
        super(image);
    }

    public withDatabase(database: string): this {
        this.database = database;
        return this;
    }

    public withUsername(username: string): this {
        this.username = username;
        return this;
    }

    public withPassword(password: string): this {
        this.password = password;
        return this;
    }

    public async start(): Promise<StartedPostgisContainer> {
        this.withExposedPorts(...(this.hasExposedPorts ? this.ports : [POSTGRES_PORT]))
            .withEnvironment({
                POSTGRES_DB: this.database,
                POSTGRES_USER: this.username,
                POSTGRES_PASSWORD: this.password,
            })
            .withStartupTimeout(120_000);

        return new StartedPostgisContainer(await super.start(), this.database, this.username, this.password);
    }
}

class AbstractStartedContainer {
    constructor(protected readonly startedTestContainer: StartedTestContainer) {}

    public stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer> {
        return this.startedTestContainer.stop(options);
    }

    public async restart(options?: Partial<RestartOptions>): Promise<void> {
        await this.startedTestContainer.restart(options);
    }

    public getHost(): Host {
        return this.startedTestContainer.getHost();
    }

    public getMappedPort(port: Port): Port {
        return this.startedTestContainer.getMappedPort(port);
    }

    public getName(): ContainerName {
        return this.startedTestContainer.getName();
    }

    public getLabels(): Labels {
        return this.startedTestContainer.getLabels();
    }

    public getId(): Id {
        return this.startedTestContainer.getId();
    }

    public getNetworkNames(): string[] {
        return this.startedTestContainer.getNetworkNames();
    }

    public getNetworkId(networkName: string): string {
        return this.startedTestContainer.getNetworkId(networkName);
    }

    public getIpAddress(networkName: string): string {
        return this.startedTestContainer.getIpAddress(networkName);
    }

    public exec(command: Command[]): Promise<ExecResult> {
        return this.startedTestContainer.exec(command);
    }

    public logs(): Promise<Readable> {
        return this.startedTestContainer.logs();
    }
}

export class StartedPostgisContainer extends AbstractStartedContainer {
    private readonly port: Port;

    constructor(
        startedTestContainer: StartedTestContainer,
        private readonly database: string,
        private readonly username: string,
        private readonly password: string
    ) {
        super(startedTestContainer);
        this.port = startedTestContainer.getMappedPort(5432);
    }

    public getPort(): Port {
        return this.port;
    }

    public getDatabase(): string {
        return this.database;
    }

    public getUsername(): string {
        return this.username;
    }

    public getPassword(): string {
        return this.password;
    }

    public getConnectionString(): string {
        return `postgresql://${this.username}:${this.password}@localhost:${this.port}/${this.database}`;
    }
}
