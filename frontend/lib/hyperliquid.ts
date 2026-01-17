import { WalletClient } from "viem";
import { ExchangeClient, InfoClient, HttpTransport } from "@nktkas/hyperliquid";

export interface ExtraAgent {
  address: `0x${string}`;
  name: string;
  validUntil: number;
}

export class HyperliquidSDK {
  private infoClient: InfoClient;
  private exchangeClient?: ExchangeClient;

  constructor(wallet?: WalletClient) {
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

  /**
   * Gets the list of extra agents (approved agent wallets) for a user.
   * @param user The user's address.
   * @returns Array of extra agent details including address, name, and validity period.
   */
  async getExtraAgents(user: string): Promise<ExtraAgent[]> {
    return this.infoClient.extraAgents({ user: user as `0x${string}` });
  }

  /**
   * Checks if a specific agent wallet is approved for a user.
   * @param user The user's address.
   * @param agentAddress The agent wallet address to check.
   * @returns True if the agent is approved and valid, false otherwise.
   */
  async isAgentApproved(user: string, agentAddress: string): Promise<boolean> {
    const agents = await this.getExtraAgents(user);
    const normalizedAgentAddress = agentAddress.toLowerCase();
    const now = Date.now();

    return agents.some(
      (agent) =>
        agent.address.toLowerCase() === normalizedAgentAddress &&
        agent.validUntil > now
    );
  }
}
