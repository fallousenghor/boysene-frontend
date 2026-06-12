import React, { useMemo, useState, useEffect } from 'react'
import {
  Package,
  Search,
  Plus,
  Printer,
  Check,
  Banknote,
  CreditCard,
  Smartphone,
  Clock,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { toast } from '@/store/ui.store'

function formatFCFA(amount) {
  const n = Number(amount || 0)
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

function stockColorClass(stock) {
  if (stock === 0) return 'text-red-600'
  if (stock <= 5) return 'text-orange-500'
  return 'text-green-600'
}

export default function NouvelleVente({ onClose }) {
  const [open, setOpen] = useState(true)
  const qc = useQueryClient()

  const handleClose = () => {
    setOpen(false)
    onClose?.()
  }

  const [activeCategory, setActiveCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [discount, setDiscount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, customersRes] = await Promise.all([
          api.get('/products', { params: { limit: 100 } }),
          api.get('/categories'),
          api.get('/customers', { params: { limit: 100 } }),
        ])
        setProducts(productsRes.data?.data || productsRes.data || [])
        setCategories(categoriesRes.data?.data || categoriesRes.data || [])
        setCustomers(customersRes.data?.data || customersRes.data || [])
      } catch (e) {
        toast.error('Erreur lors du chargement des données')
      }
    }
    fetchData()
  }, [])

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const byCat = activeCategory === 'all' || activeCategory === '' ? true : p.category?.name === activeCategory || p.categoryId === activeCategory
      const byText =
        q.length === 0 ? true : (p.name?.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q))
      return byCat && byText
    })
  }, [activeCategory, query, products])

  const addToCart = (p) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.productId === p.id)
      if (exists) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i
        )
      }
      return [...prev, {
        productId: p.id,
        name: p.name,
        ref: p.reference,
        unitPrice: p.sellPrice || p.price,
        stock: p.currentStock || p.stock,
        quantity: 1
      }]
    })
  }

  const changeQty = (productId, nextQty) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i
        const qty = Math.max(1, Math.min(Number(nextQty) || 1, i.stock))
        return { ...i, quantity: qty }
      })
    )
  }

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const subtotal = useMemo(() => {
    return cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  }, [cart])

  // Spec: total = (sous-total - remise) + TVA%
  const discountedBase = Math.max(0, subtotal - discount)
  const taxAmount = (discountedBase * taxRate) / 100
  const total = discountedBase + taxAmount

  const change = amountPaid - total

  const handleValidate = async () => {
    if (cart.length === 0) {
      toast.error('Ajoutez au moins un produit pour valider la vente.')
      return
    }

    try {
      if (paymentMethod === 'CREDIT') {
        // Create draft for credit sales
        await api.post('/sales', {
          customerId: customerId || undefined,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          taxRate,
          discount,
          notes: undefined,
        })
      } else {
        // Quick sale with immediate payment
        await api.post('/sales/quick', {
          customerId: customerId || undefined,
          items: cart.map((i) => ({
            productRef: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          paymentMethod,
          taxRate,
          discount,
          notes: undefined,
        })
      }

      qc.invalidateQueries({ queryKey: ['sales'] })
      toast.success('Vente validée !')
      handleClose()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Erreur lors de la validation')
    }
  }

  const PaymentButton = ({ id, label, Icon }) => {
    const active = paymentMethod === id
    return (
      <button
        type="button"
        onClick={() => setPaymentMethod(id)}
        className={
          'flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm transition ' +
          (active
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700')
        }
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="lg" className="p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Nouvelle vente</DialogTitle>
          <DialogDescription>Enregistrement d'une nouvelle vente</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 bg-white text-gray-900">
            <div className="grid grid-cols-2 gap-5">
              {/* COLONNE GAUCHE — Catalogue */}
              <section className="rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <div>
                      <h2 className="text-base font-semibold">Catalogue produits</h2>
                      <p className="text-xs text-gray-500">Recherchez et ajoutez au panier</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      Panier: {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  </div>
                </div>

                {/* Recherche */}
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher par nom ou référence..."
                      className="w-full h-9 pl-10 pr-3 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm"
                    />
                  </div>
                </div>

                {/* Filtres catégories */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={
                      'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ' +
                      (activeCategory === 'all' || activeCategory === ''
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')
                    }
                  >
                    Tous
                  </button>
                  {categories.map((c) => {
                    const active = activeCategory === c.id || activeCategory === c.name
                    return (
                      <button
                        key={c.id || c.name}
                        type="button"
                        onClick={() => setActiveCategory(c.id || c.name)}
                        className={
                          'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ' +
                          (active
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')
                        }
                      >
                        {c.name}
                      </button>
                    )
                  })}
                </div>

                {/* Liste produits */}
                <div className="mt-4 h-[250px] overflow-y-auto pr-1">
                  {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-sm text-gray-500 gap-2">
                      <Package className="h-6 w-6 opacity-30" />
                      <p>Aucun produit trouvé</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map((p) => {
                        const stock = p.currentStock || p.stock || 0
                        const disabled = stock === 0
                        const qty = cart.find((i) => i.productId === p.id)?.quantity || 0
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm truncate">{p.name}</p>
                              <p className="text-xs text-gray-500">
                                <span className="font-mono">{p.reference || p.ref}</span> —{' '}
                                <span className={stockColorClass(stock)}>
                                  Stock: {stock}
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-mono text-sm font-semibold">{formatFCFA(p.sellPrice || p.price)}</p>
                                {qty > 0 && <p className="text-[11px] text-gray-500">Dans panier: {qty}</p>}
                              </div>

                              <button
                                type="button"
                                onClick={() => addToCart(p)}
                                disabled={disabled}
                                className={
                                  'h-9 w-9 rounded-full border border-gray-200 grid place-items-center transition ' +
                                  (disabled
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white hover:bg-gray-50 text-blue-600')
                                }
                                title={disabled ? 'Rupture de stock' : 'Ajouter au panier'}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* COLONNE DROITE — Panier + Paiement */}
              <section className="rounded-xl border border-gray-200 shadow-sm p-4">
                {/* Panier */}
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    Panier
                  </h3>

                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm gap-3">
                      <div className="rounded-full bg-gray-100 p-2">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <p>Aucun produit ajouté</p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {cart.map((it) => {
                        const lineTotal = it.quantity * it.unitPrice
                        return (
                          <div key={it.productId} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{it.name}</p>
                              <p className="text-xs text-gray-500">
                                <span className="font-mono">{it.ref}</span> —{' '}
                                <span className="font-mono">{formatFCFA(it.unitPrice)}</span>
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => changeQty(it.productId, it.quantity - 1)}
                                  disabled={it.quantity <= 1}
                                  className={
                                    'h-7 w-7 rounded-md border grid place-items-center text-sm transition ' +
                                    (it.quantity <= 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white hover:bg-gray-50 border-gray-200')
                                  }
                                >
                                  −
                                </button>

                                <input
                                  type="number"
                                  min={1}
                                  max={it.stock}
                                  value={it.quantity}
                                  onChange={(e) => changeQty(it.productId, Number(e.target.value))}
                                  className="w-16 h-8 text-center rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-sm font-mono"
                                />

                                <button
                                  type="button"
                                  onClick={() => changeQty(it.productId, it.quantity + 1)}
                                  disabled={it.quantity >= it.stock}
                                  className={
                                    'h-7 w-7 rounded-md border grid place-items-center text-sm transition ' +
                                    (it.quantity >= it.stock ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white hover:bg-gray-50 border-gray-200')
                                  }
                                >
                                  +
                                </button>

                                <div className="ml-auto text-right">
                                  <p className="font-mono text-sm font-bold">{formatFCFA(lineTotal)}</p>
                                  <p className="text-[11px] text-gray-500">Qté: {it.quantity}</p>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(it.productId)}
                              className="mt-1 text-gray-500 hover:text-red-600 transition"
                              title="Supprimer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Client + Paiement */}
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Client</h3>
                        <p className="text-xs text-gray-500">Sélectionnez le client</p>
                      </div>

                      <button
                        type="button"
                        className="border-2 border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition"
                        onClick={() => {
                          alert('Action: Nouveau client (démo)')
                        }}
                      >
                        Nouveau client
                      </button>
                    </div>

                    <div className="mt-3">
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                      >
                        <option value="">Client comptant</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <h3 className="text-sm font-semibold">Mode de paiement</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <PaymentButton id="CASH" label="Espèces" Icon={Banknote} />
                      <PaymentButton id="CARD" label="Carte" Icon={CreditCard} />
                      <PaymentButton id="MOBILE_MONEY" label="Mobile Money" Icon={Smartphone} />
                      <PaymentButton id="CREDIT" label="Crédit" Icon={Clock} />
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Remise (FCFA)</label>
                        <input
                          type="number"
                          min={0}
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value || 0))}
                          className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">TVA (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={taxRate}
                          onChange={(e) => setTaxRate(Number(e.target.value || 0))}
                          className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sous-total</span>
                          <span className="font-mono">{formatFCFA(subtotal)}</span>
                        </div>

                        {discount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-red-600 font-semibold">Remise</span>
                            <span className="font-mono text-red-600">-{formatFCFA(discount)}</span>
                          </div>
                        )}

                        {taxRate > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">TVA</span>
                            <span className="font-mono">{formatFCFA(taxAmount)}</span>
                          </div>
                        )}

                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="font-semibold">TOTAL</span>
                          <span className="font-mono font-bold text-blue-600 text-lg">{formatFCFA(total)}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Montant encaissé</label>
                        <input
                          type="number"
                          min={0}
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(Number(e.target.value || 0))}
                          className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                        />
                      </div>

                      {amountPaid >= total && total > 0 && (
                        <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-green-700">Monnaie à rendre</span>
                          <span className="font-mono font-bold text-green-700">{formatFCFA(change)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition items-center justify-center gap-2 text-sm font-semibold text-gray-700"
                    onClick={() => alert('Aperçu / Imprimer (démo)')}
                  >
                    <Printer className="h-4 w-4" />
                    Aperçu / Imprimer
                  </button>

                  <button
                    type="button"
                    onClick={handleValidate}
                    disabled={cart.length === 0}
                    className={
                      'flex-1 h-10 rounded-lg transition items-center justify-center gap-2 text-sm font-semibold ' +
                      (cart.length === 0
                        ? 'bg-blue-200 text-blue-900 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white')
                    }
                  >
                    <Check className="h-4 w-4" />
                    Valider la vente
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
