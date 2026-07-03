/**
 * MarketplaceComposeScreen.tsx
 *
 * Lets a seller (manufacturer / pharmacist / farmer) showcase a product on the
 * marketplace feed. They pick one of their own products (which attaches the QR
 * code or farm so the backend can stamp the verified safety badge), add a
 * caption, location and hashtags, then post.
 *
 * Dark-green theme matching MarketplaceFeedScreen.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  apiBase: string;
  token: string;
  role: string;
  onPosted: () => void;
  onCancel: () => void;
};

type Product = { label: string; qrCode: string | null; farmId: string | null };

function configForRole(role: string): { domain: string; endpoint: string; pick: (d: any) => Product[] } {
  if (role === "pharmacist") {
    return {
      domain: "drug",
      endpoint: "/drug/dashboard",
      pick: (d) => (d?.dashboard?.batches ?? []).map((b: any) => ({
        label: b.drugName || b.batchNumber || "Drug batch",
        qrCode: b.qrCode ?? null,
        farmId: null,
      })),
    };
  }
  if (role === "farmer") {
    return {
      domain: "farm",
      endpoint: "/food/dashboard",
      pick: (d) => (d?.dashboard?.farms ?? []).map((f: any) => ({
        label: f.name || "Farm",
        qrCode: null,
        farmId: f.id ?? null,
      })),
    };
  }
  return {
    domain: "food",
    endpoint: "/manufacturer/dashboard",
    pick: (d) => (d?.dashboard?.batches ?? []).map((b: any) => ({
      label: b.productName || b.batchNumber || "Product batch",
      qrCode: b.qrCode ?? null,
      farmId: null,
    })),
  };
}

export function MarketplaceComposeScreen({ apiBase, token, role, onPosted, onCancel }: Props) {
  const cfg = configForRole(role);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [attached, setAttached] = useState<Product | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${apiBase}${cfg.endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setProducts(cfg.pick(data).filter((p: Product) => p.qrCode || p.farmId));
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [apiBase, token, cfg]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function selectProduct(p: Product) {
    setAttached(p);
    if (!title.trim()) setTitle(p.label);
  }

  async function submit() {
    if (!title.trim()) {
      setStatus("Please add a product title.");
      return;
    }
    setSubmitting(true);
    setStatus("");
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        domain: cfg.domain,
        caption: caption.trim(),
        location: location.trim() || null,
        hashtags: hashtags.split(/[,\s]+/).map((h) => h.replace(/^#/, "").trim()).filter(Boolean),
      };
      if (attached?.qrCode) body.qrCodeString = attached.qrCode;
      if (attached?.farmId) body.farmId = attached.farmId;

      const res = await fetch(`${apiBase}/marketplace/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err && (err.error || err.detail)) || "Could not post. Please try again.");
      }
      setSubmitted(true);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={[s.root, s.successWrap]}>
        <View style={s.successIcon}><Text style={s.successCheck}>✓</Text></View>
        <Text style={s.successTitle}>Submitted for approval</Text>
        <Text style={s.successBody}>Your product has been sent to a regulator for review. Once approved, it appears in the public marketplace with its verified safety badge.</Text>
        <Pressable style={s.postBtn} onPress={onPosted}>
          <Text style={s.postBtnText}>Back to marketplace</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <View style={s.headerRow}>
        <Pressable onPress={onCancel}><Text style={s.cancel}>Cancel</Text></Pressable>
        <Text style={s.headerTitle}>Showcase a product</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={s.label}>Attach one of your products</Text>
      <Text style={s.hint}>Attaching a product stamps the verified safety badge that buyers see.</Text>
      {loadingProducts ? (
        <ActivityIndicator color="#77c7a2" style={{ marginVertical: 12 }} />
      ) : products.length === 0 ? (
        <Text style={s.empty}>No products found. Create one in your portal first, then post it here.</Text>
      ) : (
        <View style={s.chips}>
          {products.map((p, i) => {
            const on = attached === p;
            return (
              <Pressable key={i} style={[s.chip, on && s.chipOn]} onPress={() => selectProduct(p)}>
                <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>{on ? "✓ " : ""}{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={s.label}>Title</Text>
      <TextInput style={s.input} placeholder="e.g. ZenMalt Barley Drink" placeholderTextColor="#5f6b65" value={title} onChangeText={setTitle} />

      <Text style={s.label}>Caption</Text>
      <TextInput style={[s.input, s.multiline]} placeholder="Describe your product..." placeholderTextColor="#5f6b65" value={caption} onChangeText={setCaption} multiline />

      <Text style={s.label}>Location</Text>
      <TextInput style={s.input} placeholder="e.g. Greater Accra" placeholderTextColor="#5f6b65" value={location} onChangeText={setLocation} />

      <Text style={s.label}>Hashtags</Text>
      <TextInput style={s.input} placeholder="organic, Accra, FDA" placeholderTextColor="#5f6b65" value={hashtags} onChangeText={setHashtags} autoCapitalize="none" />

      {status ? <Text style={s.error}>{status}</Text> : null}

      <Pressable style={[s.postBtn, submitting && s.postBtnOff]} onPress={() => void submit()} disabled={submitting}>
        <Text style={s.postBtnText}>{submitting ? "Posting…" : "Post to marketplace"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05080b" },
  pad: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  cancel: { color: "#7d8a84", fontSize: 14, width: 50 },
  headerTitle: { color: "#e8f0ec", fontSize: 16, fontWeight: "600" },
  label: { color: "#a9b8b1", fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 6 },
  hint: { color: "#7d8a84", fontSize: 11, marginBottom: 8 },
  empty: { color: "#7d8a84", fontSize: 12, marginVertical: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 0.5, borderColor: "rgba(119,199,162,0.3)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "100%" },
  chipOn: { backgroundColor: "#0f2c1f", borderColor: "#77c7a2" },
  chipText: { color: "#a9b8b1", fontSize: 12 },
  chipTextOn: { color: "#77c7a2", fontWeight: "600" },
  input: { backgroundColor: "#0e1712", borderWidth: 0.5, borderColor: "rgba(119,199,162,0.2)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: "#e8f0ec", fontSize: 14 },
  multiline: { height: 84, textAlignVertical: "top" },
  error: { color: "#F09595", fontSize: 13, marginTop: 12 },
  postBtn: { backgroundColor: "#77c7a2", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  postBtnOff: { opacity: 0.6 },
  postBtnText: { color: "#05080b", fontWeight: "700", fontSize: 15 },
  successWrap: { alignItems: "center", justifyContent: "center", padding: 30, gap: 14 },
  successIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#0f2c1f", borderWidth: 2, borderColor: "#77c7a2", alignItems: "center", justifyContent: "center" },
  successCheck: { color: "#77c7a2", fontSize: 44, fontWeight: "800" },
  successTitle: { color: "#e8f0ec", fontSize: 18, fontWeight: "700" },
  successBody: { color: "#a9b8b1", fontSize: 13, textAlign: "center", lineHeight: 20 },
});
