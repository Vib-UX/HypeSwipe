"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { Header } from "@/components/Header";
import { useUserStore, type AuthStatus } from "@/store/userStore";
import { usePearLogin } from "@/hooks/usePearLogin";
import { useBuilderApproval } from "@/hooks/useBuilderApproval";
import { useAgentWalletApproval } from "@/hooks/useAgentWalletApproval";

const STEPS = [
  {
    id: 1,
    title: "Connect Wallet",
    description: "Connect your wallet to get started",
  },
  { id: 2, title: "Authenticate", description: "Sign with your wallet" },
  { id: 3, title: "Approve Builder", description: "Approve builder fee code" },
  { id: 4, title: "Agent Wallet", description: "Set up agent wallet" },
] as const;

type StepNumber = 1 | 2 | 3 | 4;

export default function AuthPage() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  const { login } = usePearLogin();
  const {
    approveBuilder,
    isApproving: isBuilderApproving,
    checkMaxBuilderFee,
  } = useBuilderApproval();
  const {
    approveAgent: approveAgentWallet,
    isApproving: isAgentApproving,
    checkAgentWalletStatus,
  } = useAgentWalletApproval();

  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [isLoading, setIsLoading] = useState(false);

  const getAuthStatus = useUserStore((state) => state.getAuthStatus);
  const builderCodeApproved = useUserStore(
    (state) => state.builderCodeApproved,
  );
  const agentWalletApproved = useUserStore(
    (state) => state.agentWalletApproved,
  );
  const pearAccessToken = useUserStore((state) => state.pearAccessToken);

  const authStatus = getAuthStatus(isConnected);

  const hasAutoTriggeredAuth = useRef(false);
  const hasAutoTriggeredBuilder = useRef(false);
  const hasAutoTriggeredAgent = useRef(false);
  const hasCheckedStatusOnLoad = useRef(false);

  useEffect(() => {
    if (authStatus === "ready_to_trade") {
      router.push("/");
    }
  }, [authStatus, router]);

  useEffect(() => {
    const checkStatusOnLoad = async () => {
      if (
        isConnected &&
        address &&
        pearAccessToken &&
        !hasCheckedStatusOnLoad.current
      ) {
        hasCheckedStatusOnLoad.current = true;

        await checkMaxBuilderFee();

        await checkAgentWalletStatus();
      }
    };

    checkStatusOnLoad();
  }, [
    isConnected,
    address,
    pearAccessToken,
    checkMaxBuilderFee,
    checkAgentWalletStatus,
  ]);

  useEffect(() => {
    if (isConnected && address) {
      setCurrentStep(2);
      if (authStatus === "authenticated" && !builderCodeApproved) {
        setCurrentStep(3);
      }
      if (builderCodeApproved && !agentWalletApproved) {
        setCurrentStep(4);
      }
    } else {
      setCurrentStep(1);
      hasAutoTriggeredAuth.current = false;
      hasAutoTriggeredBuilder.current = false;
      hasAutoTriggeredAgent.current = false;
      hasCheckedStatusOnLoad.current = false;
    }
  }, [
    isConnected,
    address,
    authStatus,
    builderCodeApproved,
    agentWalletApproved,
  ]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    try {
      const result = await login();
      if (result.success) {
      }
    } catch (error) {
      console.error("Authentication failed:", error);
      hasAutoTriggeredAuth.current = false;
    }
  };

  const handleApproveBuilder = async () => {
    try {
      const result = await approveBuilder();
      if (result.success) {
      }
    } catch (error) {
      console.error("Builder approval failed:", error);
      hasAutoTriggeredBuilder.current = false;
    }
  };

  const handleApproveAgentWallet = async () => {
    try {
      const result = await approveAgentWallet();
      if (result.success) {
      }
    } catch (error) {
      console.error("Agent wallet approval failed:", error);
      hasAutoTriggeredAgent.current = false;
    }
  };

  useEffect(() => {
    if (currentStep === 2 && !hasAutoTriggeredAuth.current) {
      hasAutoTriggeredAuth.current = true;
      handleAuthenticate();
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 3 && authStatus === 'authenticated' && !hasAutoTriggeredBuilder.current) {
      hasAutoTriggeredBuilder.current = true;
      handleApproveBuilder();
    }
  }, [currentStep, authStatus]);

  useEffect(() => {
    if (currentStep === 4 && builderCodeApproved && !hasAutoTriggeredAgent.current) {
      hasAutoTriggeredAgent.current = true;
      handleApproveAgentWallet();
    }
  }, [currentStep, builderCodeApproved]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-dark-800 border-2 border-dark-600 flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-gray-400 text-sm">
                Connect your wallet to start trading with Pear Protocol
              </p>
            </div>
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Authenticate with Pear
              </h2>
              <p className="text-gray-400 text-sm">
                Sign a message to authenticate your wallet
              </p>
            </div>
            <button
              onClick={handleAuthenticate}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              {isLoading ? "Authenticating..." : "Sign to Authenticate"}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Approve Builder Code
              </h2>
              <p className="text-gray-400 text-sm">
                Approve the builder fee code on Hyperliquid
              </p>
            </div>
            <button
              onClick={handleApproveBuilder}
              disabled={isBuilderApproving}
              className="w-full px-6 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              {isBuilderApproving ? "Approving..." : "Approve Builder Code"}
            </button>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Set Up Agent Wallet
              </h2>
              <p className="text-gray-400 text-sm">
                Approve agent wallet on Hyperliquid
              </p>
            </div>
            <button
              onClick={handleApproveAgentWallet}
              disabled={isAgentApproving}
              className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              {isAgentApproving ? "Setting Up..." : "Approve Agent Wallet"}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-2xl">
            <h1 className="text-2xl font-bold mb-6 text-center">
              Complete Setup
            </h1>

            <div className="space-y-4 mb-8">
              {STEPS.map((step) => {
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                      isCompleted
                        ? "bg-green-500/10 border border-green-500/30"
                        : isCurrent
                          ? "bg-primary-500/10 border border-primary-500/30"
                          : "bg-dark-800 border border-dark-700 opacity-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-primary-500 text-white"
                            : "bg-dark-700 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-gray-400">
                        {step.description}
                      </p>
                    </div>
                    {isCurrent && (
                      <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-dark-700">
              {renderStepContent()}
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            Powered by <span className="text-primary-400">Pear Protocol</span>
          </p>
        </div>
      </main>
    </div>
  );
}
