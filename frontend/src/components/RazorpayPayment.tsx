// src/components/RazorpayPayment.tsx
import React, { useState } from "react";

interface RazorpayPaymentProps {
  amount: number;
  orderId?: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

// ✅ ADD THIS LINE - API_BASE for Render
const API_BASE = "https://skymart-h.onrender.com";

export function RazorpayPayment({
  amount,
  orderId,
  onSuccess,
  onFailure,
}: RazorpayPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error("Failed to load Razorpay SDK");
      }

      // ✅ FIXED: Use API_BASE instead of localhost
      const response = await fetch(`${API_BASE}/api/payments/create-order/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          amount: amount,
          receipt: orderId || `order_${Date.now()}`,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "SkyMart",
        description: "Premium Shopping Experience",
        image: "https://your-logo-url.com/logo.png",
        order_id: data.order_id,
        handler: function (response: any) {
          verifyPayment(response, data.order_id);
        },
        prefill: {
          name: localStorage.getItem("userName") || "Customer",
          email: localStorage.getItem("userEmail") || "customer@skymart.com",
          contact: "9876543210",
        },
        notes: {
          address: "SkyMart Premium Collection",
        },
        theme: {
          color: "#F59E0B",
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
            onFailure("Payment cancelled by user");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      setError(error.message);
      onFailure(error.message);
      setIsLoading(false);
    }
  };

  const verifyPayment = async (response: any, orderId: string) => {
    try {
      // ✅ FIXED: Use API_BASE instead of localhost
      const verifyResponse = await fetch(`${API_BASE}/api/payments/verify/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }),
      });

      const data = await verifyResponse.json();

      if (data.success) {
        onSuccess(data.payment_id);
      } else {
        throw new Error(data.error || "Payment verification failed");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      onFailure(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={isLoading}
        className={`w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm uppercase tracking-wider flex items-center justify-center gap-2 ${isLoading ? "opacity-70 cursor-not-allowed" : ""
          }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Processing...
          </>
        ) : (
          <>
            <span>Pay ₹{amount}</span>
            <span className="text-xs opacity-70">via UPI/Card</span>
          </>
        )}
      </button>

      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-stone-400">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          Secured by Razorpay
        </span>
        <span>🔒 128-bit encrypted</span>
      </div>
    </div>
  );
}
