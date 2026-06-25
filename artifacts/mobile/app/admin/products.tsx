import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  status: 'active' | 'draft' | 'archived';
}

const SEED: AdminProduct[] = [
  { id: '1', name: 'Wireless Earbuds Pro', category: 'Electronics', price: 1999, stock: 45, description: 'Premium wireless earbuds with ANC.', status: 'active' },
  { id: '2', name: 'Cotton Kurta Set', category: 'Clothing', price: 899, stock: 120, description: 'Handwoven cotton kurta for men.', status: 'active' },
  { id: '3', name: 'Smart LED Bulb', category: 'Home', price: 349, stock: 0, description: 'Voice-controlled LED bulb 9W.', status: 'draft' },
  { id: '4', name: 'Running Shoes', category: 'Footwear', price: 2499, stock: 30, description: 'Lightweight mesh running shoes.', status: 'active' },
];

const CATEGORIES = ['Electronics', 'Clothing', 'Home', 'Footwear', 'Books', 'Beauty', 'Accessories'];
const STATUS_COLORS: Record<string, string> = { active: '#10B981', draft: '#F59E0B', archived: '#6B7280' };

function ProductModal({ visible, product, onSave, onClose }: {
  visible: boolean;
  product: AdminProduct | null;
  onSave: (p: AdminProduct) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? 'Electronics');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '');
  const [desc, setDesc] = useState(product?.description ?? '');
  const [status, setStatus] = useState<AdminProduct['status']>(product?.status ?? 'active');

  React.useEffect(() => {
    if (product) { setName(product.name); setCategory(product.category); setPrice(String(product.price)); setStock(String(product.stock)); setDesc(product.description); setStatus(product.status); }
    else { setName(''); setCategory('Electronics'); setPrice(''); setStock(''); setDesc(''); setStatus('active'); }
  }, [product, visible]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error', 'Product name is required.'); return; }
    if (!price || isNaN(Number(price))) { Alert.alert('Error', 'Enter a valid price.'); return; }
    onSave({ id: product?.id ?? Date.now().toString(), name: name.trim(), category, price: Number(price), stock: Number(stock) || 0, description: desc.trim(), status });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
          <TouchableOpacity onPress={handleSave}><Text style={[styles.saveText, { color: colors.primary }]}>Save</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          {[
            { label: 'Product Name *', value: name, onChange: setName, placeholder: 'e.g. Wireless Earbuds' },
            { label: 'Price (₹) *', value: price, onChange: setPrice, placeholder: 'e.g. 1999', keyboard: 'numeric' },
            { label: 'Stock Quantity', value: stock, onChange: setStock, placeholder: 'e.g. 50', keyboard: 'numeric' },
            { label: 'Description', value: desc, onChange: setDesc, placeholder: 'Brief product description', multi: true },
          ].map((f) => (
            <View key={f.label}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
              <TextInput
                style={[styles.fieldInput, f.multi && { minHeight: 80 }, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                value={f.value}
                onChangeText={f.onChange}
                placeholder={f.placeholder}
                placeholderTextColor={colors.mutedForeground}
                keyboardType={(f.keyboard as any) ?? 'default'}
                multiline={!!f.multi}
                textAlignVertical={f.multi ? 'top' : 'center'}
              />
            </View>
          ))}
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.chip, { backgroundColor: category === c ? colors.primary : colors.card, borderColor: colors.border }]} onPress={() => setCategory(c)}>
                  <Text style={{ color: category === c ? '#fff' : colors.foreground, fontSize: 13, fontFamily: 'Inter_500Medium' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Status</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {(['active', 'draft', 'archived'] as const).map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, { backgroundColor: status === s ? STATUS_COLORS[s] : colors.card, borderColor: colors.border }]} onPress={() => setStatus(s)}>
                <Text style={{ color: status === s ? '#fff' : colors.foreground, fontSize: 13, fontFamily: 'Inter_500Medium', textTransform: 'capitalize' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AdminProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>(SEED);
  const [search, setSearch] = useState('');
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);
  const [showModal, setShowModal] = useState(false);
  const topPadding = Platform.OS === 'web' ? 24 : insets.top;

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  const saveProduct = (p: AdminProduct) => {
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [p, ...prev];
    });
  };

  const deleteProduct = (id: string) => {
    Alert.alert('Delete Product', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setProducts((prev) => prev.filter((p) => p.id !== id)) },
    ]);
  };

  const renderItem = ({ item }: { item: AdminProduct }) => (
    <View style={[styles.productCard, { backgroundColor: colors.card }]}>
      <View style={[styles.productIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="package" size={22} color={colors.primary} />
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.productMeta, { color: colors.mutedForeground }]}>{item.category} · Stock: {item.stock}</Text>
        <View style={styles.productRow}>
          <Text style={[styles.productPrice, { color: colors.primary }]}>₹{item.price}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
          </View>
        </View>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditProduct(item); setShowModal(true); }}>
          <Feather name="edit-2" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteProduct(item.id)}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity onPress={() => { setEditProduct(null); setShowModal(true); }} style={styles.addBtn}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={[styles.searchBar, { backgroundColor: colors.card, margin: 16 }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput style={{ flex: 1, color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 14 }} placeholder="Search products..." placeholderTextColor={colors.mutedForeground} value={search} onChangeText={setSearch} />
      </View>
      <View style={[styles.summaryRow, { paddingHorizontal: 16, marginBottom: 8 }]}>
        <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>{filtered.length} products</Text>
        <Text style={[styles.summaryText, { color: colors.success }]}>{products.filter((p) => p.status === 'active').length} active</Text>
      </View>
      <FlatList data={filtered} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40 }}><Feather name="package" size={40} color={colors.mutedForeground} /><Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: 'Inter_400Regular' }}>No products found</Text></View>} />
      <ProductModal visible={showModal} product={editProduct} onSave={saveProduct} onClose={() => { setShowModal(false); setEditProduct(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { padding: 4 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  productCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, gap: 12, elevation: 1 },
  productIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  productMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  productPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  productActions: { gap: 8 },
  actionBtn: { padding: 6 },
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  saveText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});
