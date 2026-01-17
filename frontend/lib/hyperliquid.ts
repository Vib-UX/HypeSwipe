import { WalletClient } from "viem";
import { ExchangeClient, InfoClient, HttpTransport } from "@nktkas/hyperliquid";

export class HyperliquidSDK {
  private infoClient: InfoClient;
  private exchangeClient?: ExchangeClient;
  private wallet?: WalletClient;

  constructor(wallet?: WalletClient) {
    this.wallet = wallet;
    this.infoClient = new InfoClient({ transport: new HttpTransport() });

    if (wallet) {
      this.exchangeClient = new ExchangeClient({
        transport: new HttpTransport(),
        wallet: wallet as any,
      });
    }
  }

  /**
   * Checks the maximum builder fee approved for a user.
   * @param user The user's address.
   * @param builder The builder's address.
   * @returns The maximum builder fee.
   */
  async getMaxBuilderFee(user: string, builder: string): Promise<number> {
    return this.infoClient.maxBuilderFee({ user, builder });
  }

  /**
   * Approves a builder fee for the connected user.
   * @param builder The builder's code.
   * @param maxFeeRate The maximum fee rate (e.g., '0.1%').
   * @returns The result of the approval.
   */
  async approveBuilderFee(
    builder: string,
    maxFeeRate: string,
  ): Promise<{ status: string; response: any }> {
    if (!this.exchangeClient) {
      throw new Error("Wallet not provided. Cannot approve builder fee.");
    }
    return this.exchangeClient.approveBuilderFee({ builder, maxFeeRate });
  }
}
