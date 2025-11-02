// screens/YoutubeSearch.jsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlobalLang } from "../components/GlobalLang";
import TtsPlayer from "../components/TtsPlayer";

const tMap = {
  ko: { title: "MZ 유행어 사전", cat:{react:"감탄/반응",compliment:"칭찬/격려",complain:"불만/현타",dating:"연애/썸",money:"돈/가성비",work:"공부/일"}, play:"재생" },
  en: { title: "MZ Slang by Situation", cat:{react:"Reactions",compliment:"Compliments",complain:"Gripes",dating:"Dating",money:"Money/Value",work:"Study/Work"}, play:"Play" },
  ja: { title: "MZ流 行語（状況別）", cat:{react:"リアクション",compliment:"ほめ/励まし",complain:"不満/メンタル",dating:"恋愛/ソム",money:"お金/コスパ",work:"勉強/仕事"}, play:"再生" },
};

// ★ ROMA(영문 표기) 추가: 영어 UI에서만 노출
const SLANG = {
  react: [
    { id:"r1", ko:"개추",   romaEn:"gae-chu",        en:"Huge upvote / strongly recommend.", ja:"超おすすめ。" },
    { id:"r2", ko:"실화냐", romaEn:"sil-hwa-nya",   en:"For real? / Are you serious?",      ja:"マジで？本当？" },
    { id:"r3", ko:"개웃겨", romaEn:"gae-ut-ggyeo",  en:"That’s hilarious.",                 ja:"めっちゃウケる。" },
    { id:"r4", ko:"ㄹㅇ",   romaEn:"real (abbr.)",  en:"For real (abbr.).",                 ja:"ガチで。" },
  ],
  compliment: [
    { id:"c1", ko:"갓생 산다", romaEn:"gat-saeng sanda", en:"Living a god-tier disciplined life.", ja:"神レベルに規則正しい生活。" },
    { id:"c2", ko:"미쳤다",    romaEn:"mi-chyeot-da",    en:"That’s insane(ly good).",             ja:"クオリティやばい。" },
    { id:"c3", ko:"찢었다",    romaEn:"jjijeot-da",      en:"You crushed it / nailed it.",         ja:"ぶちかました / 大成功。" },
    { id:"c4", ko:"존잘/존예",  romaEn:"jon-jal / jon-ye", en:"Super handsome / super pretty.",    ja:"超イケメン / 超美人。" },
  ],
  complain: [
    { id:"b1", ko:"현타 왔다", romaEn:"hyeon-ta wat-da", en:"Reality hit me / sudden slump.", ja:"現実に打ちのめされた感じ。" },
    { id:"b2", ko:"멘붕",     romaEn:"men-bung",        en:"Mental breakdown.",               ja:"メンタル崩壊。" },
    { id:"b3", ko:"노답",     romaEn:"nodap",           en:"No answer / hopeless.",           ja:"解決策なし / 絶望的。" },
    { id:"b4", ko:"빡센데?",   romaEn:"ppak-sen-de?",    en:"That’s tough / brutal.",          ja:"きついね。" },
  ],
  dating: [
    { id:"d1", ko:"썸 탄다",   romaEn:"sseom tanda",    en:"In a talking stage.",           ja:"いい感じの関係（恋愛一歩手前）。" },
    { id:"d2", ko:"심쿵",     romaEn:"sim-kung",       en:"Heart-fluttering.",              ja:"胸きゅん。" },
    { id:"d3", ko:"너 T야?",   romaEn:"neo ti-ya?",     en:"Are you a T? (MBTI meme).",     ja:"君、Tタイプ？（MBTIネタ）" },
    { id:"d4", ko:"현웃 터짐", romaEn:"hyeon-ut teojim", en:"I literally laughed.",          ja:"思わず笑った。" },
  ],
  money: [
    { id:"m1", ko:"가심비",   romaEn:"ga-sim-bi",     en:"Satisfaction per price.",        ja:"満足度重視のコスパ。" },
    { id:"m2", ko:"플렉스",   romaEn:"peul-lek-seu",  en:"Flex / splurge.",                ja:"見せつけ系の散財。" },
    { id:"m3", ko:"탕진잼",   romaEn:"tangjin-jaem",  en:"Fun of blowing money.",          ja:"散財の楽しさ。" },
    { id:"m4", ko:"혜자롭다",  romaEn:"hyeja-ropda",   en:"Super generous for the price.",  ja:"コスパ神。" },
  ],
  work: [
    { id:"w1", ko:"열정페이", romaEn:"yeoljeong-pay", en:"Underpaid ‘passion’ labor.",     ja:"情熱ペイ（低待遇の労働）。" },
    { id:"w2", ko:"퇴근각",   romaEn:"toegeun-gak",   en:"Time to clock out.",             ja:"そろそろ退勤。" },
    { id:"w3", ko:"학구라",   romaEn:"hak-gura",      en:"Sudden study grind mood.",       ja:"急に勉強モード。" },
    { id:"w4", ko:"열공 모드", romaEn:"yeolgong modeu", en:"Hard-study mode.",             ja:"勉強ガチモード。" },
  ],
};

const CAT_KEYS = ["react", "compliment", "complain", "dating", "money", "work"];

export default function YoutubeSearch() {
  const insets = useSafeAreaInsets();
  const { lang, font } = useGlobalLang();
  const t = useMemo(() => tMap[lang] ?? tMap.ko, [lang]);

  const [cat, setCat] = useState("react");
  const [ttsLines, setTtsLines] = useState([]);
  const [ttsLang, setTtsLang] = useState("ko");
  const [ttsKey, setTtsKey] = useState(0);

  const onSpeak = useCallback((text, l) => {
    setTtsLang(l);
    setTtsLines([text]);
    setTtsKey(k => k + 1);
  }, []);

  const renderItem = ({ item }) => {
    const showRoma = lang === "en"; // 영어 UI에서만 ROMA 라인 노출
    return (
      <View style={styles.card}>
        <Text style={[styles.ko, { fontFamily: font }]}>{item.ko}</Text>
        <Text style={[styles.exp, { fontFamily: font }]}>
          {/* 한국어 짧은 설명은 ko 기준 문장 그대로 두고, 뜻은 하단 EN/JA 라인에서 제공 */}
        </Text>

        {/* KO 원문 → 한국어 억양 */}
        <View style={styles.line}>
          <Text style={[styles.label, { fontFamily: font }]}>[KO]</Text>
          <Text style={[styles.txt, { fontFamily: font }]}>{item.ko}</Text>
          <TouchableOpacity style={styles.play} onPress={() => onSpeak(item.ko, "ko")}>
            <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
          </TouchableOpacity>
        </View>

        {/* EN UI일 때만: ROMA(영문 표기) — 영어 뜻 → 영어 억양 */}
        {showRoma && (
          <View style={styles.line}>
            <Text style={[styles.label, { fontFamily: font }]}>[ROMA]</Text>
            <Text style={[styles.txt, { fontFamily: font }]}>
              {item.romaEn} — {item.en}
            </Text>
            <TouchableOpacity style={styles.play} onPress={() => onSpeak(item.romaEn, "en")}>
              <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EN 의미 → 영어 억양 */}
        <View style={styles.line}>
          <Text style={[styles.label, { fontFamily: font }]}>[EN]</Text>
          <Text style={[styles.txt, { fontFamily: font }]}>{item.en}</Text>
          <TouchableOpacity style={styles.play} onPress={() => onSpeak(item.en, "en")}>
            <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
          </TouchableOpacity>
        </View>

        {/* JA 번역 → 일본어 억양 */}
        <View style={styles.line}>
          <Text style={[styles.label, { fontFamily: font }]}>[JA]</Text>
          <Text style={[styles.txt, { fontFamily: font }]}>{item.ja}</Text>
          <TouchableOpacity style={styles.play} onPress={() => onSpeak(item.ja, "ja")}>
            <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const data = SLANG[cat] ?? [];

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <Text style={[styles.header, { fontFamily: font }]}>{t.title}</Text>

      {/* 카테고리 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {CAT_KEYS.map((k) => {
          const label = t.cat[k];
          const active = k === cat;
          return (
            <TouchableOpacity key={k} onPress={() => setCat(k)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabTxt, { fontFamily: font }, active && styles.tabTxtActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      {/* 숨김 플레이어: 라인/언어 바뀔 때마다 해당 억양으로 재생 */}
      <TtsPlayer key={ttsKey} lines={ttsLines} lang={ttsLang} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  header: { fontSize: 22, marginBottom: 10, color: "#111" },
  tabs: { paddingVertical: 4, paddingRight: 8 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1, borderColor: "#e5e5e5", marginRight: 8, backgroundColor: "#fff",
  },
  tabActive: { backgroundColor: "#111", borderColor: "#111" },
  tabTxt: { fontSize: 13, color: "#333" },
  tabTxtActive: { color: "#fff" },

  list: { paddingBottom: 24, paddingTop: 8 },
  card: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 6 },
  ko: { fontSize: 18, color: "#111" },
  exp: { fontSize: 13, color: "#666", marginTop: -2 },
  line: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" },
  label: { fontSize: 12, color: "#999", width: 54 },
  txt: { flexShrink: 1, fontSize: 14, color: "#222" },
  play: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#111", marginLeft: "auto" },
  playTxt: { color: "#fff", fontSize: 12 },
});
