type ProductWithDiscount = {
  id: string;
  price: number;
  discountPercent: number | null;
  discountAmount: number | null;
};

type ActivePromotion = {
  id: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  appliesToAll: boolean;
  products: { productId: string }[];
};

export function calculateEffectivePrice(
  product: ProductWithDiscount,
  promotions: ActivePromotion[]
): number {
  let bestPrice = product.price;

  // 1. Réduction individuelle du produit
  if (product.discountAmount && product.discountAmount > 0) {
    bestPrice = Math.max(0, product.price - product.discountAmount);
  } else if (product.discountPercent && product.discountPercent > 0) {
    bestPrice = product.price * (1 - product.discountPercent / 100);
  }

  // 2. Vérifier les promotions — garder la meilleure offre
  for (const promo of promotions) {
    const applies =
      promo.appliesToAll ||
      promo.products.some((pp) => pp.productId === product.id);
    if (!applies) continue;

    let promoPrice = product.price;
    if (promo.discountType === "FIXED") {
      promoPrice = Math.max(0, product.price - promo.discountValue);
    } else {
      promoPrice = product.price * (1 - promo.discountValue / 100);
    }

    if (promoPrice < bestPrice) {
      bestPrice = promoPrice;
    }
  }

  return Math.round(bestPrice * 100) / 100;
}

export function findBestPromotion(
  product: ProductWithDiscount,
  promotions: ActivePromotion[]
): ActivePromotion | null {
  let bestPromo: ActivePromotion | null = null;
  let bestDiscount = 0;

  // Calcul réduction individuelle
  let productDiscount = 0;
  if (product.discountAmount && product.discountAmount > 0) {
    productDiscount = product.discountAmount;
  } else if (product.discountPercent && product.discountPercent > 0) {
    productDiscount = (product.price * product.discountPercent) / 100;
  }

  for (const promo of promotions) {
    const applies =
      promo.appliesToAll ||
      promo.products.some((pp) => pp.productId === product.id);
    if (!applies) continue;

    let promoDiscount = 0;
    if (promo.discountType === "FIXED") {
      promoDiscount = promo.discountValue;
    } else {
      promoDiscount = (product.price * promo.discountValue) / 100;
    }

    if (promoDiscount > bestDiscount && promoDiscount > productDiscount) {
      bestDiscount = promoDiscount;
      bestPromo = promo;
    }
  }

  return bestPromo;
}
