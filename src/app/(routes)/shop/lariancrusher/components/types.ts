export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  details?: string[];
}

export interface ViewMode {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

export interface ShowcaseSectionMeta {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface ShopSettings {
  stripePaymentLink: string;
  productPrice: number;
  productName: string;
}
