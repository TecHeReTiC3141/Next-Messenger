import { DefaultUser, DefaultSession } from "next-auth";

declare module "next-auth" {

    interface Session {
        user: {
            id: string,
        } & DefaultSession["user"];
        accessToken: string;
    }

    interface User extends DefaultUser{
        id: string;
        access_token?: string;
    };

}