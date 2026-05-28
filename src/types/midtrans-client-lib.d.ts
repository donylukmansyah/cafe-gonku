declare module "midtrans-client" {
    type MidtransOptions = {
        isProduction: boolean;
        serverKey: string | undefined;
        clientKey: string | undefined;
    };

    interface SnapClient {
        createTransaction(parameter: Record<string, unknown>): Promise<{
            token: string;
            redirect_url: string;
        }>;
    }

    interface CoreApiClient {
        charge(parameter: Record<string, unknown>): Promise<Record<string, unknown>>;
    }

    const midtransClient: {
        Snap: new (options: MidtransOptions) => SnapClient;
        CoreApi: new (options: MidtransOptions) => CoreApiClient;
    };

    export default midtransClient;
}
