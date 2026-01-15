'use client';

import {
  ShoppingBag,
  Save,
  ExternalLink,
  CreditCard,
  Tag,
  Power,
  RefreshCw,
  Check,
  Package,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  stripeLink: string;
  enabled: boolean;
}

interface AdminShopClientProps {
  initialSettings: Record<string, string>;
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'opencrusher',
    name: 'OPENCRUSHER',
    price: 0,
    stripeLink: '',
    enabled: true,
  },
  {
    id: 'lariancrusher',
    name: 'LarianCrusher',
    price: 20,
    stripeLink: '',
    enabled: true,
  },
];

export default function AdminShopClient({ initialSettings }: AdminShopClientProps) {
  const [shopEnabled, setShopEnabled] = useState(
    initialSettings.shopEnabled === 'true' || initialSettings.shopEnabled === undefined
  );
  const [products, setProducts] = useState<Product[]>(() => {
    // Try to parse products from settings or use defaults
    if (initialSettings.products) {
      try {
        return JSON.parse(initialSettings.products);
      } catch {
        return DEFAULT_PRODUCTS;
      }
    }
    // Migrate old settings to new format
    return [
      {
        id: 'opencrusher',
        name: 'OPENCRUSHER',
        price: 0,
        stripeLink: '',
        enabled: true,
      },
      {
        id: 'lariancrusher',
        name: initialSettings.productName || 'LarianCrusher',
        price: parseInt(initialSettings.productPrice, 10) || 20,
        stripeLink: initialSettings.stripePaymentLink || '',
        enabled: true,
      },
    ];
  });
  const [selectedProduct, setSelectedProduct] = useState<string>('lariancrusher');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentProduct = products.find((p) => p.id === selectedProduct) || products[1];

  const updateProduct = (field: keyof Product, value: string | number | boolean) => {
    setProducts(products.map((p) => (p.id === selectedProduct ? { ...p, [field]: value } : p)));
  };

  // Toggle shop enabled - saves immediately
  const toggleShopEnabled = async () => {
    const newValue = !shopEnabled;
    setShopEnabled(newValue);

    // Save immediately
    try {
      await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopEnabled: newValue,
          products,
          productName: products.find((p) => p.id === 'lariancrusher')?.name || 'LarianCrusher',
          productPrice: products.find((p) => p.id === 'lariancrusher')?.price || 20,
          stripePaymentLink: products.find((p) => p.id === 'lariancrusher')?.stripeLink || '',
        }),
      });
    } catch (error) {
      console.error('Error toggling shop:', error);
      // Revert on error
      setShopEnabled(!newValue);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopEnabled,
          products,
          // Keep legacy fields for backward compatibility
          productName: products.find((p) => p.id === 'lariancrusher')?.name || 'LarianCrusher',
          productPrice: products.find((p) => p.id === 'lariancrusher')?.price || 20,
          stripePaymentLink: products.find((p) => p.id === 'lariancrusher')?.stripeLink || '',
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-black via-[#0c0117] to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 max-w-3xl mx-auto">
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
            ← Retour au panel admin
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-orange-500/20 w-12 h-12 flex items-center justify-center rounded-lg">
              <ShoppingBag className="text-orange-400 h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-audiowide text-white">Configuration Boutique</h1>
              <p className="text-gray-400">
                Gérez les paramètres de la boutique et les liens Stripe
              </p>
            </div>
          </div>
        </div>

        {/* Settings Form - CENTERED */}
        <div className="grid gap-6 max-w-3xl mx-auto">
          {/* Shop Enabled Toggle */}
          <div className="glass rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Power className={`w-5 h-5 ${shopEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                <div>
                  <h3 className="text-white font-medium">Boutique activée</h3>
                  <p className="text-gray-400 text-sm">
                    {shopEnabled
                      ? 'La boutique est visible pour tous les visiteurs'
                      : 'La boutique est masquée (visible uniquement pour les admins)'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleShopEnabled}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  shopEnabled ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                    shopEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Product Selector */}
          <div className="glass rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-orange-400" />
              <h3 className="text-white font-medium">Produits</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    selectedProduct === product.id
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {product.name}
                  {product.price === 0 && (
                    <span className="ml-2 text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded">
                      GRATUIT
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Product Settings */}
          <div className="glass rounded-xl p-6 border border-orange-500/30 bg-orange-500/5">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-400" />
              Configuration: {currentProduct.name}
            </h3>

            <div className="grid gap-4">
              {/* Product Name */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Nom du produit</label>
                <input
                  type="text"
                  value={currentProduct.name}
                  onChange={(e) => updateProduct('name', e.target.value)}
                  className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Product Price */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Prix (€)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    value={currentProduct.price}
                    onChange={(e) => updateProduct('price', parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-black/50 border border-purple-500/30 rounded-lg pl-8 pr-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>

              {/* Stripe Link */}
              {currentProduct.price > 0 && (
                <div>
                  <label className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    Lien de paiement Stripe
                  </label>
                  <input
                    type="url"
                    value={currentProduct.stripeLink}
                    onChange={(e) => updateProduct('stripeLink', e.target.value)}
                    className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="https://buy.stripe.com/..."
                  />
                  {currentProduct.stripeLink && (
                    <a
                      href={currentProduct.stripeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-sm text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                    >
                      Tester le lien <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Product Enabled */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-white font-medium">Produit actif</p>
                  <p className="text-gray-400 text-sm">Afficher ce produit dans la boutique</p>
                </div>
                <button
                  onClick={() => updateProduct('enabled', !currentProduct.enabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    currentProduct.enabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      currentProduct.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
            }`}
          >
            {saving ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <>
                <Check className="w-5 h-5" />
                Enregistré !
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les modifications
              </>
            )}
          </button>

          {/* Quick Links */}
          <div className="glass rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-white font-medium mb-4">Liens rapides</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                target="_blank"
                className="text-sm bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-2"
              >
                Voir la boutique <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/shop/lariancrusher"
                target="_blank"
                className="text-sm bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
              >
                Page LarianCrusher <ExternalLink className="w-3 h-3" />
              </Link>
              <a
                href="https://dashboard.stripe.com/payment-links"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center gap-2"
              >
                Stripe Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
