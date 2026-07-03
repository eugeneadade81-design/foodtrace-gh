/**
 * MarketplaceFeedScreen.tsx
 *
 * The FoodTrace GH marketplace social feed. Sellers (manufacturer / farmer /
 * pharmacist) post products; everyone browses, likes, saves, comments, and
 * taps "Scan to verify" to open the live safety result for a post's QR code.
 *
 * Every post carries a safety badge (FDA Approved / EPA Cleared / Recalled)
 * that the backend resolves from the real scan/recall system — it cannot be
 * faked by the seller.
 *
 * Dark-green theme: background #05080b, accent #77c7a2.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type MarketplacePost = {
  id: string;
  domain: string;
  title: string;
  caption: string;
  location: string | null;
  hashtags: string[];
  qrCodeString: string | null;
  safetyStatus: string;
  safetyLabel: string;
  safetySource: string;
  status: string; // active | pending | flagged | recalled | hidden
  sellerName: string;
  sellerRole: string;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  savedByViewer: boolean;
};

type Comment = { id: string; body: string; authorName: string; authorRole: string };

type Props = {
  apiBase: string;
  token: string;
  currentUserRole: string;
  onVerifyCode: (code: string, domain: string) => void;
  onCompose: () => void;
};

const FILTERS: { key: string; label: string; domain: string | null }[] = [
  { key: "all", label: "All Products", domain: null },
  { key: "food", label: "Food", domain: "food" },
  { key: "drug", label: "Drugs", domain: "drug" },
  { key: "farm", label: "Farms", domain: "farm" },
];

const SELLER_ROLES = ["manufacturer", "farmer", "pharmacist"];

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "FT";
}

function badgeColors(status: string): { bg: string; fg: string } {
  if (status === "recalled") return { bg: "#2a0f0f", fg: "#F09595" };
  if (status === "unverified") return { bg: "#241a08", fg: "#EF9F27" };
  if (status === "epa_cleared") return { bg: "#0f2438", fg: "#85B7EB" };
  return { bg: "#0f2c1f", fg: "#77c7a2" }; // fda_approved / default
}

function domainIcon(domain: string): string {
  if (domain === "drug") return "💊";
  if (domain === "farm") return "🌿";
  return "🥤";
}

export function MarketplaceFeedScreen({ apiBase, token, currentUserRole, onVerifyCode, onCompose }: Props) {
  const [posts, setPosts] = useState<MarketplacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const isSeller = SELLER_ROLES.includes(currentUserRole);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const domain = FILTERS.find((f) => f.key === filter)?.domain;
      const url = `${apiBase}/marketplace/posts${domain ? `?domain=${domain}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(res.status >= 500 ? "Server is waking up. Pull to refresh in a moment." : "Could not load the feed.");
      const data = await res.json();
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the feed.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, filter]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  function patchPost(id: string, changes: Partial<MarketplacePost>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  async function toggleLike(post: MarketplacePost) {
    // optimistic
    patchPost(post.id, {
      likedByViewer: !post.likedByViewer,
      likeCount: post.likeCount + (post.likedByViewer ? -1 : 1),
    });
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/like`, { method: "POST", headers: authHeaders });
      const data = await res.json();
      patchPost(post.id, { likedByViewer: data.liked, likeCount: data.likeCount });
    } catch {
      void loadFeed();
    }
  }

  async function toggleSave(post: MarketplacePost) {
    patchPost(post.id, { savedByViewer: !post.savedByViewer });
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/save`, { method: "POST", headers: authHeaders });
      const data = await res.json();
      patchPost(post.id, { savedByViewer: data.saved });
    } catch {
      void loadFeed();
    }
  }

  async function toggleComments(post: MarketplacePost) {
    if (openComments[post.id]) {
      setOpenComments((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      return;
    }
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/comments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOpenComments((prev) => ({ ...prev, [post.id]: data.comments ?? [] }));
    } catch {
      setOpenComments((prev) => ({ ...prev, [post.id]: [] }));
    }
  }

  async function approve(post: MarketplacePost) {
    patchPost(post.id, { status: "active" });
    try {
      await fetch(`${apiBase}/marketplace/posts/${post.id}/approve`, { method: "PATCH", headers: authHeaders });
    } catch {
      void loadFeed();
    }
  }

  async function submitComment(post: MarketplacePost) {
    const body = (commentDraft[post.id] || "").trim();
    if (!body) return;
    setCommentDraft((prev) => ({ ...prev, [post.id]: "" }));
    try {
      const res = await fetch(`${apiBase}/marketplace/posts/${post.id}/comments`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      setOpenComments((prev) => ({ ...prev, [post.id]: [...(prev[post.id] ?? []), data.comment] }));
      patchPost(post.id, { commentCount: post.commentCount + 1 });
    } catch {
      /* ignore */
    }
  }

  function renderPost({ item: post }: { item: MarketplacePost }) {
    const pending = post.status === "pending";
    const badge = pending ? { bg: "#241a08", fg: "#EF9F27" } : badgeColors(post.safetyStatus);
    const badgeLabel = pending ? "Pending approval" : post.safetyLabel;
    const comments = openComments[post.id];
    return (
      <View style={s.card}>
        <View style={s.cardHead}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials(post.sellerName)}</Text></View>
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.sellerName} numberOfLines={1}>{post.sellerName}</Text>
              <View style={s.roleChip}><Text style={s.roleChipText}>{String(post.sellerRole).toUpperCase()}</Text></View>
            </View>
            <Text style={s.metaText}>{post.location ? `${post.location} · ` : ""}{post.domain}</Text>
          </View>
        </View>

        <View style={s.imageArea}>
          <Text style={s.imageIcon}>{domainIcon(post.domain)}</Text>
          <View style={[s.badge, { backgroundColor: badge.bg, borderColor: badge.fg }]}>
            <Text style={[s.badgeText, { color: badge.fg }]}>{badgeLabel}</Text>
          </View>
        </View>

        {post.title ? <Text style={s.title}>{post.title}</Text> : null}
        {post.caption ? <Text style={s.caption}>{post.caption}</Text> : null}
        {post.hashtags?.length ? (
          <Text style={s.hashtags}>{post.hashtags.map((h) => `#${h}`).join("  ")}</Text>
        ) : null}

        {post.qrCodeString ? (
          <View style={s.qrStrip}>
            <View style={s.qrBox}><Text style={s.qrBoxIcon}>▦</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.qrCode} numberOfLines={1}>{post.qrCodeString}</Text>
              <Text style={s.qrHint}>Tap to check live safety status</Text>
            </View>
            <Pressable style={s.verifyBtn} onPress={() => onVerifyCode(post.qrCodeString!, post.domain)}>
              <Text style={s.verifyBtnText}>Scan to verify</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={s.actions}>
          <Pressable style={s.actionBtn} onPress={() => void toggleLike(post)}>
            <Text style={[s.actionText, post.likedByViewer && s.likeOn]}>{post.likedByViewer ? "♥" : "♡"} {post.likeCount}</Text>
          </Pressable>
          <Pressable style={s.actionBtn} onPress={() => void toggleComments(post)}>
            <Text style={s.actionText}>💬 {post.commentCount}</Text>
          </Pressable>
          <Pressable style={s.actionBtn} onPress={() => void toggleSave(post)}>
            <Text style={[s.actionText, post.savedByViewer && s.saveOn]}>{post.savedByViewer ? "★ Saved" : "☆ Save"}</Text>
          </Pressable>
        </View>

        {pending && currentUserRole === "regulator" ? (
          <Pressable style={s.approveBtn} onPress={() => void approve(post)}>
            <Text style={s.approveBtnText}>✓ Approve this post</Text>
          </Pressable>
        ) : pending ? (
          <Text style={s.pendingNote}>Awaiting regulator approval before it goes public.</Text>
        ) : null}

        {comments ? (
          <View style={s.comments}>
            {comments.length === 0 ? (
              <Text style={s.noComments}>No comments yet — be the first.</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={s.commentRow}>
                  <View style={s.commentAvatar}><Text style={s.commentAvatarText}>{initials(c.authorName)}</Text></View>
                  <Text style={s.commentText}><Text style={s.commentAuthor}>{c.authorName} </Text>{c.body}</Text>
                </View>
              ))
            )}
            <View style={s.commentInputRow}>
              <TextInput
                style={s.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#7d8a84"
                value={commentDraft[post.id] || ""}
                onChangeText={(t) => setCommentDraft((prev) => ({ ...prev, [post.id]: t }))}
              />
              <Pressable onPress={() => void submitComment(post)}><Text style={s.sendText}>Send</Text></Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} style={[s.filter, filter === f.key && s.filterOn]} onPress={() => setFilter(f.key)}>
            <Text style={[s.filterText, filter === f.key && s.filterTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {isSeller ? (
        <Pressable style={s.composeBar} onPress={onCompose}>
          <Text style={s.composePlus}>+</Text>
          <Text style={s.composeText}>Showcase your product...</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#77c7a2" /><Text style={s.centerText}>Loading feed…</Text></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => void loadFeed()}><Text style={s.retryText}>Try again</Text></Pressable>
        </View>
      ) : posts.length === 0 ? (
        <View style={s.center}><Text style={s.centerText}>No products posted yet.</Text></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          refreshing={loading}
          onRefresh={() => void loadFeed()}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05080b" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10, flexWrap: "wrap" },
  filter: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, borderWidth: 0.5, borderColor: "rgba(119,199,162,0.3)" },
  filterOn: { backgroundColor: "#77c7a2", borderColor: "#77c7a2" },
  filterText: { color: "#a9b8b1", fontSize: 12 },
  filterTextOn: { color: "#05080b", fontWeight: "600" },
  composeBar: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 4, backgroundColor: "#0e1712", borderWidth: 0.5, borderColor: "rgba(119,199,162,0.2)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  composePlus: { color: "#77c7a2", fontSize: 18, fontWeight: "700" },
  composeText: { color: "#7d8a84", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  centerText: { color: "#7d8a84", fontSize: 13 },
  errorText: { color: "#F09595", fontSize: 13, textAlign: "center" },
  retryBtn: { backgroundColor: "#77c7a2", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: "#05080b", fontWeight: "600" },

  card: { backgroundColor: "#0b120e", borderWidth: 0.5, borderColor: "rgba(119,199,162,0.14)", borderRadius: 16, marginBottom: 12, overflow: "hidden" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1d9e75", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sellerName: { color: "#e8f0ec", fontSize: 14, fontWeight: "600", flexShrink: 1 },
  roleChip: { backgroundColor: "rgba(119,199,162,0.16)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  roleChipText: { color: "#77c7a2", fontSize: 9, fontWeight: "600" },
  metaText: { color: "#7d8a84", fontSize: 11, marginTop: 1 },

  imageArea: { height: 168, backgroundColor: "#10241b", alignItems: "center", justifyContent: "center" },
  imageIcon: { fontSize: 54 },
  badge: { position: "absolute", top: 10, right: 10, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "600" },

  title: { color: "#e8f0ec", fontSize: 14, fontWeight: "600", paddingHorizontal: 14, paddingTop: 10 },
  caption: { color: "#d8e2dc", fontSize: 13, lineHeight: 19, paddingHorizontal: 14, paddingTop: 4 },
  hashtags: { color: "#77c7a2", fontSize: 12, paddingHorizontal: 14, paddingTop: 6 },

  qrStrip: { flexDirection: "row", alignItems: "center", gap: 10, margin: 14, backgroundColor: "#0e1712", borderWidth: 0.5, borderColor: "rgba(119,199,162,0.2)", borderRadius: 12, padding: 10 },
  qrBox: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  qrBoxIcon: { color: "#05080b", fontSize: 22 },
  qrCode: { color: "#e8f0ec", fontSize: 12, fontWeight: "600" },
  qrHint: { color: "#7d8a84", fontSize: 10 },
  verifyBtn: { backgroundColor: "#77c7a2", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  verifyBtnText: { color: "#05080b", fontSize: 11, fontWeight: "600" },

  actions: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "rgba(119,199,162,0.1)", paddingVertical: 8 },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 4 },
  actionText: { color: "#a9b8b1", fontSize: 13 },
  likeOn: { color: "#D4537E" },
  saveOn: { color: "#EF9F27" },
  approveBtn: { margin: 12, marginTop: 0, backgroundColor: "#0f2c1f", borderWidth: 1, borderColor: "#77c7a2", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  approveBtnText: { color: "#77c7a2", fontWeight: "700", fontSize: 13 },
  pendingNote: { color: "#EF9F27", fontSize: 11, paddingHorizontal: 14, paddingBottom: 12 },

  comments: { borderTopWidth: 0.5, borderTopColor: "rgba(119,199,162,0.1)", padding: 12, gap: 10 },
  noComments: { color: "#7d8a84", fontSize: 12 },
  commentRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  commentAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#23332c", alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: "#77c7a2", fontSize: 10, fontWeight: "600" },
  commentText: { color: "#cdd8d2", fontSize: 12, flex: 1, lineHeight: 17 },
  commentAuthor: { color: "#e8f0ec", fontWeight: "600" },
  commentInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  commentInput: { flex: 1, backgroundColor: "#0e1712", borderWidth: 0.5, borderColor: "rgba(119,199,162,0.2)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, color: "#e8f0ec", fontSize: 12 },
  sendText: { color: "#77c7a2", fontWeight: "600", fontSize: 13, paddingHorizontal: 6 },
});
