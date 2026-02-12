import { prisma } from "@/lib/prisma";

let FedaPay: any = null;
let Transaction: any = null;

async function loadFedaPay() {
  if (!FedaPay) {
    const mod = await import("fedapay");
    FedaPay = mod.FedaPay;
    Transaction = mod.Transaction;
  }
}

export async function initFedaPay() {
  await loadFedaPay();
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings?.fedapaySecretKey) {
    throw new Error("Cles FedaPay non configurees");
  }
  FedaPay.setApiKey(settings.fedapaySecretKey);
  FedaPay.setEnvironment(settings.fedapayEnvironment || "sandbox");
  return settings;
}

export async function createTransaction(
  orderId: string,
  amount: number,
  customerName: string,
  callbackUrl: string
) {
  await initFedaPay();

  const transaction = await Transaction.create({
    description: `Commande #${orderId.slice(-6)}`,
    amount: Math.round(amount),
    currency: { iso: "XOF" },
    callback_url: callbackUrl,
    customer: {
      firstname: customerName,
    },
    custom_metadata: {
      order_id: orderId,
    },
  });

  const token = await transaction.generateToken();

  return {
    transactionId: String(transaction.id),
    paymentUrl: token.url,
  };
}

export async function checkTransactionStatus(transactionId: string) {
  await initFedaPay();
  const transaction = await Transaction.retrieve(transactionId);
  return {
    status: transaction.status, // "approved", "declined", "pending"
    amount: transaction.amount,
  };
}
