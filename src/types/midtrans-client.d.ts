declare module 'midtrans-client' {
    export class Snap {
        constructor(options: {
            isProduction: boolean;
            serverKey: string | undefined;
            clientKey: string | undefined;
        });

        createTransaction(parameter: any): Promise<{
            token: string;
            redirect_url: string;
        }>;
    }

    export class CoreApi {
        constructor(options: {
            isProduction: boolean;
            serverKey: string | undefined;
            clientKey: string | undefined;
        });

        charge(parameter: any): Promise<any>;
    }
}
