// screens/MzSlangScreen.jsx
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlobalLang } from "../components/GlobalLang";
import TtsPlayer from "../components/TtsPlayer";

const tMap = {
  ko: {
    title: "MZ 유행어 사전",
    cat: { react: "감탄/반응", compliment: "칭찬/격려", complain: "불만/현타", dating: "연애/썸", money: "돈/가성비", work: "공부/일" },
    play: "재생",
  },
  en: {
    title: "MZ Slang by Situation",
    cat: { react: "Reactions", compliment: "Compliments", complain: "Gripes", dating: "Dating", money: "Money/Value", work: "Study/Work" },
    play: "Play",
  },
  ja: {
    title: "MZ流 行語（状況別）",
    cat: { react: "リアクション", compliment: "ほめ/励まし", complain: "不満/メンタル", dating: "恋愛/ソム", money: "お金/コスパ", work: "勉強/仕事" },
    play: "再生",
  },
};

/** 표시: ko(원문), en/ja(뜻).  TTS: 한국어만(초성은 확장해 읽기) */
const SLANG = {
  react: [
    { id:"r1",  ko:"개추",       en:"Huge upvote / strongly recommend.", ja:"超おすすめ。" },
    { id:"r2",  ko:"실화냐",     en:"For real? Are you serious?",       ja:"マジで？本当？" },
    { id:"r3",  ko:"개웃겨",     en:"That's hilarious.",                ja:"めっちゃウケる。" },
    { id:"r4",  ko:"ㄹㅇ",       en:"For real (abbr.).",                ja:"ガチで。" },
    { id:"r5",  ko:"ㅇㅈ",       en:"Agree / valid.",                   ja:"それな / 同意。" },
    { id:"r6",  ko:"킹받네",     en:"That's so infuriating (kinda funny).", ja:"イラつく（ネタ気味）。" },
    { id:"r7",  ko:"ㅋㅋ루삥뽕", en:"LOL (meme-ish laugh).",            ja:"（ネタ系の）大笑い。" },
  ],
  compliment: [
    { id:"c1", ko:"갓생 산다",   en:"Living a god-tier disciplined life.", ja:"神レベルに規則正しい生活。" },
    { id:"c2", ko:"미쳤다",      en:"That's insane(ly good).",            ja:"クオリティやばい。" },
    { id:"c3", ko:"찢었다",      en:"You crushed it / nailed it.",        ja:"ぶちかました / 大成功。" },
    { id:"c4", ko:"존잘/존예",    en:"Super handsome / super pretty.",     ja:"超イケメン / 超美人。" },
    { id:"c5", ko:"레게노",      en:"Legend(ary).",                        ja:"レジェンド級。" },
    { id:"c6", ko:"금손",        en:"Golden hands (very skilled).",       ja:"金の手（超上手）。" },
    { id:"c7", ko:"고인물",      en:"Veteran / very experienced.",        ja:"古参・ベテラン。" },
  ],
  complain: [
    { id:"b1", ko:"현타 왔다",   en:"Reality hit me / sudden slump.",     ja:"現実に打ちのめされた感じ。" },
    { id:"b2", ko:"멘붕",        en:"Mental breakdown.",                   ja:"メンタル崩壊。" },
    { id:"b3", ko:"노답",        en:"No answer / hopeless.",               ja:"解決策なし / 絶望的。" },
    { id:"b4", ko:"빡센데?",     en:"That's tough / brutal.",              ja:"きついね。" },
    { id:"b5", ko:"갑분싸",      en:"Sudden awkward silence.",             ja:"急にシーンとなる空気。" },
    { id:"b6", ko:"개노잼",      en:"Super boring.",                        ja:"超つまらん。" },
    { id:"b7", ko:"현실 자각",   en:"Reality check.",                      ja:"現実を思い知る。" },
  ],
  dating: [
    { id:"d1", ko:"썸 탄다",     en:"In a talking stage.",                 ja:"いい感じの関係（恋愛一歩手前）。" },
    { id:"d2", ko:"심쿵",        en:"Heart-fluttering.",                   ja:"胸きゅん。" },
    { id:"d3", ko:"너 T야?",     en:"Are you a T? (MBTI meme).",           ja:"君、Tタイプ？（MBTIネタ）" },
    { id:"d4", ko:"현웃 터짐",   en:"I literally laughed.",                ja:"思わず笑った。" },
    { id:"d5", ko:"밀당",        en:"Push & pull (playing hard to get).",  ja:"駆け引き。" },
    { id:"d6", ko:"알고리즘 탔다", en:"The algorithm shipped us (fate joke).", ja:"アルゴリズムの導き（ネタ）。" },
    { id:"d7", ko:"솔탈",        en:"Escaped single life.",                ja:"脱ソロ。" },
  ],
  money: [
    { id:"m1", ko:"가심비",      en:"Satisfaction per price.",             ja:"満足度重視のコスパ。" },
    { id:"m2", ko:"플렉스",      en:"Flex / splurge.",                     ja:"見せつけ系の散財。" },
    { id:"m3", ko:"탕진잼",      en:"Fun of blowing money.",               ja:"散財の楽しさ。" },
    { id:"m4", ko:"혜자롭다",     en:"Super generous for the price.",       ja:"コスパ神。" },
    { id:"m5", ko:"무지출",      en:"No-spend challenge.",                 ja:"無支出チャレンジ。" },
    { id:"m6", ko:"짠테크",      en:"Frugal financial hacks.",             ja:"節約テク。" },
    { id:"m7", ko:"복포 탔다",    en:"Got company benefit points.",         ja:"福利厚生ポイント獲得。" },
  ],
  work: [
    { id:"w1", ko:"열정페이",    en:"Underpaid 'passion' labor.",          ja:"情熱ペイ（低待遇の労働）。" },
    { id:"w2", ko:"퇴근각",      en:"Time to clock out.",                   ja:"そろそろ退勤。" },
    { id:"w3", ko:"학구라",      en:"Sudden study grind mood.",             ja:"急に勉強モード。" },
    { id:"w4", ko:"열공 모드",    en:"Hard-study mode.",                     ja:"勉強ガチモード。" },
    { id:"w5", ko:"야근각",      en:"Looks like overtime.",                 ja:"残業の予感。" },
    { id:"w6", ko:"칼퇴",        en:"Leave work on the dot.",               ja:"定時退社。" },
    { id:"w7", ko:"증명해라",    en:"Prove it (show results).",             ja:"証明してみろ。" },
  ],
};

const CAT_KEYS = ["react", "compliment", "complain", "dating", "money", "work"];

/** 초성/밈 확장: 화면 표시는 그대로 두고, TTS만 이 값으로 읽음 */
function expandAbbrev(ko) {
  if (ko === "ㅇㅈ") return "인정";
  if (ko === "ㄹㅇ") return "레알";
  if (ko === "ㅋㅋ루삥뽕") return "쿠쿠루삥뽥"; // 발음 자연스럽게
  return ko;
}

export default function MzSlangScreen() {
  const insets = useSafeAreaInsets();
  const { lang, font } = useGlobalLang();
  const t = useMemo(() => tMap[lang] ?? tMap.ko, [lang]);

  const [cat, setCat] = useState("react");
  const [ttsLines, setTtsLines] = useState([]);
  const [ttsLang, setTtsLang] = useState("ko");
  const [ttsKey, setTtsKey] = useState(0);

  const onSpeak = useCallback((text) => {
    setTtsLang("ko");
    setTtsLines([text]);
    setTtsKey((k) => k + 1);
  }, []);

  const renderItem = ({ item }) => {
    const koForTts = expandAbbrev(item.ko);

    return (
      <View style={styles.card}>
        {/* 상단: KO 원문 + 우측 단일 재생 버튼(한국어만) */}
        <View style={styles.row}>
          <Text style={[styles.ko, { fontFamily: font }]}>{item.ko}</Text>
          <TouchableOpacity style={styles.play} onPress={() => onSpeak(koForTts)}>
            <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
          </TouchableOpacity>
        </View>

        {/* 뜻 표기: EN / JA (표시만, 재생 없음) */}
        <View style={styles.line}>
          <Text style={[styles.label, { fontFamily: font }]}>[EN]</Text>
          <Text style={[styles.txt, { fontFamily: font }]}>{item.en}</Text>
        </View>
        <View style={styles.line}>
          <Text style={[styles.label, { fontFamily: font }]}>[JA]</Text>
          <Text style={[styles.txt, { fontFamily: font }]}>{item.ja}</Text>
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

      {/* 숨김 플레이어 */}
      <TtsPlayer key={ttsKey} lines={ttsLines} lang={ttsLang} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16, paddingBottom: 16 },
  header: { fontSize: 22, marginBottom: 10, color: "#111" },
  tabs: { paddingVertical: 4, paddingRight: 8 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    borderWidth: 1, borderColor: "#e5e5e5", marginRight: 8, backgroundColor: "#fff",
  },
  tabActive: { backgroundColor: "#111", borderColor: "#111" },
  tabTxt: { fontSize: 13, color: "#333" },
  tabTxtActive: { color: "#fff" },
  list: { paddingBottom: 100, paddingTop: 4 },
  card: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  ko: { fontSize: 18, color: "#111", flexShrink: 1 },
  line: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 2, flexWrap: "wrap" },
  label: { fontSize: 12, color: "#999", width: 64 },
  txt: { flexShrink: 1, fontSize: 14, color: "#222" },
  play: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#111", marginLeft: "auto" },
  playTxt: { color: "#fff", fontSize: 12 },
});
