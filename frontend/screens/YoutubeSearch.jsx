// screens/YoutubeSearch.jsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, ActivityIndicator, Linking, Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlobalLang } from "../components/GlobalLang";
import { ytSearchMukbang } from "../config/api";

const tMap = {
  ko: { title: "유튜브 먹방 검색", placeholder: "예) 김치찌개", button: "검색", empty: "결과가 없어요." },
  en: { title: "YouTube Mukbang Search", placeholder: "e.g., Kimchi stew", button: "Search", empty: "No results." },
  ja: { title: "YouTube モッパン検索", placeholder: "例）キムチチゲ", button: "検索", empty: "結果がありません。" },
};

export default function YoutubeSearch() {
  const insets = useSafeAreaInsets();
  const { lang, font } = useGlobalLang();
  const t = useMemo(() => tMap[lang] ?? tMap.ko, [lang]);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const doSearch = useCallback(async () => {
    if (!q.trim()) return;
    try {
      setLoading(true);
      const data = await ytSearchMukbang(q, lang);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("ytSearchMukbang error", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, lang]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(item.videoUrl)}>
      <Image source={{ uri: item.thumbnailUrl || item.thumbnail }} style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { fontFamily: font }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.channelTitle ? (
          <Text style={[styles.meta, { fontFamily: font }]} numberOfLines={1}>
            {item.channelTitle}
          </Text>
        ) : null}
        {(item.viewCount || item.publishedAt) ? (
          <Text style={[styles.sub, { fontFamily: font }]} numberOfLines={1}>
            {item.viewCount ? Number(item.viewCount).toLocaleString() : ""}{item.publishedAt ? ` • ${String(item.publishedAt).slice(0,10)}` : ""}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <Text style={[styles.header, { fontFamily: font }]}>{t.title}</Text>

      <View style={styles.row}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t.placeholder}
          placeholderTextColor="#999"
          style={[styles.input, { fontFamily: font }]}
          returnKeyType="search"
          onSubmitEditing={doSearch}
        />
        <TouchableOpacity style={styles.btn} onPress={doSearch}>
          <Text style={[styles.btnText, { fontFamily: font }]}>{t.button}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size={Platform.OS === "ios" ? "large" : 40} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => item?.videoId ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={items.length ? styles.list : styles.emptyWrap}
          ListEmptyComponent={<Text style={[styles.empty, { fontFamily: font }]}>{t.empty}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  header: { fontSize: 22, marginBottom: 12 },
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1, borderColor: "#ddd", borderRadius: 10,
    paddingHorizontal: 12, height: 44,
  },
  btn: {
    height: 44, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: "#222", justifyContent: "center", alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16 },
  list: { paddingBottom: 24 },
  emptyWrap: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#888" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  thumb: { width: 120, height: 68, borderRadius: 8, backgroundColor: "#eee" },
  title: { fontSize: 15, color: "#222" },
  meta: { fontSize: 13, color: "#444", marginTop: 2 },
  sub: { fontSize: 12, color: "#777", marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
