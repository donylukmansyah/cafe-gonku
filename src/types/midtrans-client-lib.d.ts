declare module "midtrans-client" {
    class Snap {
        constructor(options: {
            isProduction: boolean;
            serverKey: string | undefined;
            clientKey: string | undefined;
        });

        createTransaction(parameter: Record<string, unknown>): Promise<{
            token: string;
            redirect_url: string;
        }>;
    }

    class CoreApi {
        constructor(options: {
            isProduction: boolean;
            serverKey: string | undefined;
            clientKey: string | undefined;
        });

        charge(parameter: Record<string, unknown>): Promise<Record<string, unknown>>;
    }

    const midtransClient: {
        Snap: typeof Snap;
        CoreApi: typeof CoreApi;
    };

    export default midtransClient;
}
