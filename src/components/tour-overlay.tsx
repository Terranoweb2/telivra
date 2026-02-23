"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  HandMetal,
  UtensilsCrossed,
  MousePointerClick,
  MapPinned,
  CookingPot,
  ChevronRight,
  Tag,
  Truck,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TourOverlayProps {
  chatEnabled?: boolean;
  pickupEnabled?: boolean;
  hasPromotions?: boolean;
}

interface TourStep {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export function TourOverlay({ chatEnabled, pickupEnabled, hasPromotions }: TourOverlayProps) {
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const steps = useMemo(() => {
    const s: TourStep[] = [];
    let n = 1;

    s.push({
      icon: <HandMetal className="w-7 h-7 text-orange-400" />,
      title: "Bienvenue !",
      desc: "Découvrez comment commander vos plats en quelques étapes simples.",
    });

    s.push({
      icon: <UtensilsCrossed className="w-7 h-7 text-orange-400" />,
      title: `${n}. Choisissez vos plats`,
      desc: "Parcourez le menu et utilisez la recherche pour trouver vos plats favoris.",
    });
    n++;

    if (hasPromotions) {
      s.push({
        icon: <Tag className="w-7 h-7 text-orange-400" />,
        title: `${n}. Promotions`,
        desc: "Profitez de nos offres spéciales ! Les plats en promotion sont signalés avec leur prix réduit.",
      });
      n++;
    }

    s.push({
      icon: <MousePointerClick className="w-7 h-7 text-orange-400" />,
      title: `${n}. Ajoutez au panier`,
      desc: "Appuyez sur le bouton + pour ajouter un plat. Ajustez les quantités avec + et −.",
    });
    n++;

    if (pickupEnabled) {
      s.push({
        icon: <Truck className="w-7 h-7 text-orange-400" />,
        title: `${n}. Livraison ou À emporter`,
        desc: "Choisissez entre la livraison a domicile ou le retrait au restaurant. Pas de frais pour le retrait !",
      });
    } else {
      s.push({
        icon: <MapPinned className="w-7 h-7 text-orange-400" />,
        title: `${n}. Livraison`,
        desc: "Renseignez vos informations et sélectionnez votre adresse sur la carte interactive.",
      });
    }
    n++;

    if (chatEnabled) {
      s.push({
        icon: <MessageCircle className="w-7 h-7 text-orange-400" />,
        title: `${n}. Discutez avec nous`,
        desc: "Une question ? Utilisez le chat intégré pour contacter le restaurant a tout moment.",
      });
      n++;
    }

    s.push({
      icon: <CookingPot className="w-7 h-7 text-orange-400" />,
      title: `${n}. Validez et savourez !`,
      desc: "Choisissez votre mode de paiement, validez et suivez votre commande en temps réel. Bon appétit !",
    });

    return s;
  }, [chatEnabled, pickupEnabled, hasPromotions]);

  const completeTour = useCallback(() => {
    setShowTour(false);
    setTourStep(0);
    try { localStorage.setItem("onboarding-tour-seen", "1"); } catch {}
  }, []);

  const nextTourStep = useCallback(() => {
    setTourStep((prev) => {
      if (prev < steps.length - 1) return prev + 1;
      completeTour();
      return 0;
    });
  }, [steps.length, completeTour]);

  useEffect(() => {
    try {
      if (!localStorage.getItem("onboarding-tour-seen")) {
        const t = setTimeout(() => setShowTour(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  if (!showTour) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={completeTour} />
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl border-t border-gray-800 p-5 pb-8 animate-in slide-in-from-bottom duration-300">
        {/* Progress bars */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i <= tourStep ? "bg-orange-500 w-6" : "bg-gray-700 w-4"
                )}
              />
            ))}
          </div>
          <button
            onClick={completeTour}
            className="text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors"
          >
            Passer
          </button>
        </div>

        {/* Step content */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 bg-orange-600/15 rounded-2xl flex items-center justify-center shrink-0">
            {steps[tourStep].icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {steps[tourStep].title}
            </h3>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              {steps[tourStep].desc}
            </p>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={nextTourStep}
          className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {tourStep === steps.length - 1 ? (
            <>C&apos;est parti ! <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Suivant <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
