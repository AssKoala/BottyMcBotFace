import { Collection, ClientOptions } from "discord.js";

declare module "discord.js" {
  export interface Client {
    commands: Collection<any, any>;
  }

  export interface ClientOptions {
    autoReconnect: boolean;
  }
}