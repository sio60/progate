// screens/YoutubeSearch.jsx
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

/** 
 * 슬랭 항목 스키마
 *  { id, ko, romaEn, kanaJa, en, ja }
 *   - ko: 원문(한국어)
 *   - romaEn: 영어권 발음용 로마자(한국어 TTS로 한국인 영어 발음 느낌)
 *   - kanaJa: 일본어권 발음용 가타카나(한국어 TTS로 한국인 일본어 발음 느낌)
 *   - en/ja: 뜻(설명)
 */
const SLANG = {
  react: [
    { id:"r1",  ko:"개추",       romaEn:"gae-chu",                kanaJa:"ゲチュ",                en:"Huge upvote / strongly recommend.", ja:"超おすすめ。" },
    { id:"r2",  ko:"실화냐",     romaEn:"sil-hwa-nya?",           kanaJa:"シルファニャ？",        en:"For real? Are you serious?",       ja:"マジで？本当？" },
    { id:"r3",  ko:"개웃겨",     romaEn:"gae-ut-ggyeo",           kanaJa:"ゲウッキョ",            en:"That's hilarious.",                ja:"めっちゃウケる。" },
    { id:"r4",  ko:"ㄹㅇ",       romaEn:"real",                   kanaJa:"リアル",                en:"For real (abbr.).",                ja:"ガチで。" },
    { id:"r5",  ko:"ㅇㅈ",       romaEn:"injeong",                kanaJa:"インジョン",            en:"Agree / valid.",                   ja:"それな / 同意。" },
    { id:"r6",  ko:"킹받네",     romaEn:"king-bad-ne",            kanaJa:"キングバンネ",          en:"That's so infuriating (kinda funny).", ja:"イラつく（ネタ気味）。" },
    { id:"r7",  ko:"ㅋㅋ루삥뽕", romaEn:"kku-kku ru-pping-ppong", kanaJa:"クック ルピングポン",    en:"LOL (meme-ish laugh).",            ja:"（ネタ系の）大笑い。" },
  ],
  compliment: [
    { id:"c1", ko:"갓생 산다",   romaEn:"gat-saeng sanda",        kanaJa:"ガッセン サンダ",        en:"Living a god-tier disciplined life.", ja:"神レベルに規則正しい生活。" },
    { id:"c2", ko:"미쳤다",      romaEn:"mi-chyeot-da",           kanaJa:"ミチョッタ",            en:"That's insane(ly good).",           ja:"クオリティやばい。" },
    { id:"c3", ko:"찢었다",      romaEn:"jji-jeot-da",            kanaJa:"ッチジョッタ",           en:"You crushed it / nailed it.",       ja:"ぶちかました / 大成功。" },
    { id:"c4", ko:"존잘/존예",    romaEn:"jon-jal / jon-ye",       kanaJa:"ジョンジャル / ジョンイェ", en:"Super handsome / super pretty.",  ja:"超イケメン / 超美人。" },
    { id:"c5", ko:"레게노",      romaEn:"lege-no (legend)",       kanaJa:"レゲノ",                en:"Legend(ary).",                      ja:"レジェンド級。" },
    { id:"c6", ko:"금손",        romaEn:"geum-son",               kanaJa:"グムソン",              en:"Golden hands (very skilled).",      ja:"金の手（超上手）。" },
    { id:"c7", ko:"고인물",      romaEn:"go-in-mul",              kanaJa:"ゴインムル",            en:"Veteran / very experienced.",       ja:"古参・ベテラン。" },
  ],
  complain: [
    { id:"b1", ko:"현타 왔다",   romaEn:"hyeon-ta wat-da",        kanaJa:"ヒョンタ ワッタ",        en:"Reality hit me / sudden slump.",     ja:"現実に打ちのめされた感じ。" },
    { id:"b2", ko:"멘붕",        romaEn:"men-bung",               kanaJa:"メンブン",              en:"Mental breakdown.",                   ja:"メンタル崩壊。" },
    { id:"b3", ko:"노답",        romaEn:"nodap",                  kanaJa:"ノダプ",                en:"No answer / hopeless.",               ja:"解決策なし / 絶望的。" },
    { id:"b4", ko:"빡센데?",     romaEn:"ppak-sen-de?",           kanaJa:"ッパクセンデ？",         en:"That's tough / brutal.",              ja:"きついね。" },
    { id:"b5", ko:"갑분싸",      romaEn:"gap-bun-ssa",            kanaJa:"カップンサ",            en:"Sudden awkward silence.",             ja:"急にシーンとなる空気。" },
    { id:"b6", ko:"개노잼",      romaEn:"gae-no-jaem",            kanaJa:"ゲノジェム",            en:"Super boring.",                        ja:"超つまらん。" },
    { id:"b7", ko:"현실 자각",   romaEn:"hyeon-sil jagak",        kanaJa:"ヒョンシル ジャガク",    en:"Reality check.",                      ja:"現実を思い知る。" },
  ],
  dating: [
    { id:"d1", ko:"썸 탄다",     romaEn:"sseom tanda",            kanaJa:"ソム タンダ",            en:"In a talking stage.",                 ja:"いい感じの関係（恋愛一歩手前）。" },
    { id:"d2", ko:"심쿵",        romaEn:"sim-kung",               kanaJa:"シムクン",              en:"Heart-fluttering.",                   ja:"胸きゅん。" },
    { id:"d3", ko:"너 T야?",     romaEn:"neo ti-ya?",             kanaJa:"ノ ティヤ？",            en:"Are you a T? (MBTI meme).",           ja:"君、Tタイプ？（MBTIネタ）" },
    { id:"d4", ko:"현웃 터짐",   romaEn:"hyeon-ut teojim",        kanaJa:"ヒョヌッ トジム",        en:"I literally laughed.",                ja:"思わず笑った。" },
    { id:"d5", ko:"밀당",        romaEn:"mil-dang",               kanaJa:"ミルダン",              en:"Push & pull (playing hard to get).",  ja:"駆け引き。" },
    { id:"d6", ko:"알고리즘 탔다", romaEn:"algorijeum tat-da",     kanaJa:"アルゴリズム タッタ",    en:"The algorithm shipped us (fate joke).", ja:"アルゴリズムの導き（ネタ）。" },
    { id:"d7", ko:"솔탈",        romaEn:"sol-tal",                kanaJa:"ソルタル",              en:"Escaped single life.",                ja:"脱ソロ。" },
  ],
  money: [
    { id:"m1", ko:"가심비",      romaEn:"ga-sim-bi",              kanaJa:"カシンビ",              en:"Satisfaction per price.",             ja:"満足度重視のコスパ。" },
    { id:"m2", ko:"플렉스",      romaEn:"flex",                   kanaJa:"フレックス",            en:"Flex / splurge.",                     ja:"見せつけ系の散財。" },
    { id:"m3", ko:"탕진잼",      romaEn:"tangjin-jaem",           kanaJa:"タンジンジェム",        en:"Fun of blowing money.",               ja:"散財の楽しさ。" },
    { id:"m4", ko:"혜자롭다",     romaEn:"hyeja-rop-da",           kanaJa:"ヘジャロプダ",          en:"Super generous for the price.",       ja:"コスパ神。" },
    { id:"m5", ko:"무지출",      romaEn:"mu-jichul",              kanaJa:"ムジチュル",            en:"No-spend challenge.",                 ja:"無支出チャレンジ。" },
    { id:"m6", ko:"짠테크",      romaEn:"jjan-tech",              kanaJa:"ッチャンテク",          en:"Frugal financial hacks.",             ja:"節約テク。" },
    { id:"m7", ko:"복포 탔다",    romaEn:"bok-po tat-da",          kanaJa:"ボッポ タッタ",         en:"Got company benefit points.",         ja:"福利厚生ポイント獲得。" },
  ],
  work: [
    { id:"w1", ko:"열정페이",    romaEn:"yeoljeong-pay",          kanaJa:"ヨルジョンペイ",        en:"Underpaid 'passion' labor.",          ja:"情熱ペイ（低待遇の労働）。" },
    { id:"w2", ko:"퇴근각",      romaEn:"toegeun-gak",            kanaJa:"トェグンガク",          en:"Time to clock out.",                   ja:"そろそろ退勤。" },
    { id:"w3", ko:"학구라",      romaEn:"hak-gura",               kanaJa:"ハックラ",              en:"Sudden study grind mood.",             ja:"急に勉強モード。" },
    { id:"w4", ko:"열공 모드",    romaEn:"yeol-gong modeu",        kanaJa:"ヨルゴン モドゥ",        en:"Hard-study mode.",                     ja:"勉強ガチモード。" },
    { id:"w5", ko:"야근각",      romaEn:"ya-geun-gak",            kanaJa:"ヤグンガク",            en:"Looks like overtime.",                 ja:"残業の予感。" },
    { id:"w6", ko:"칼퇴",        romaEn:"kal-toe",                kanaJa:"カルトェ",              en:"Leave work on the dot.",               ja:"定時退社。" },
    { id:"w7", ko:"증명해라",    romaEn:"jeung-myeong-hae-ra",    kanaJa:"ジュンミョン ヘラ",      en:"Prove it (show results).",             ja:"証明してみろ。" },
  ],
};

const CAT_KEYS = ["react", "compliment", "complain", "dating", "money", "work"];

// ---- Ko TTS 억양 변형 유틸 (영어/일본어 느낌) ----
const H_BASE = 0xac00;
const CHOS = 19, JUNGS = 21, JONGS = 28;

function decomposeHangul(ch) {
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const s = code - H_BASE;
  const cho = Math.floor(s / (JUNGS*JONGS));
  const jung = Math.floor((s % (JUNGS*JONGS)) / JONGS);
  const jong = s % JONGS; // 0이면 받침 없음
  return { cho, jung, jong };
}

function composeHangul(cho, jung, jong=0) {
  return String.fromCharCode(H_BASE + (cho*JUNGS*JONGS) + (jung*JONGS) + jong);
}

// 받침 → "모음 붙여 터뜨리기" (한국어 TTS가 외국인 억양처럼 읽게)
function _explodeBatchimKo(word, mapFn) {
  const JONG_TO_TAG = {
    1:'G', 2:'GG', 3:'N', 4:'D', 5:'L', 6:'M', 7:'B', 8:'S', 9:'SS', 10:'NG',
    11:'J', 12:'C', 13:'K', 14:'T', 15:'P', 16:'H', // 단일 받침
    // 겹받침은 대충 근사: 종성 분해 없이 대표로 잡기
    17:'G', 18:'G', 19:'G', 20:'N', 21:'N', 22:'N', 23:'L', 24:'L', 25:'L', 26:'L', 27:'P'
  };
  let out = '';
  for (const ch of word) {
    const d = decomposeHangul(ch);
    if (!d) { out += ch; continue; }
    if (d.jong === 0) { out += ch; continue; }
    const tag = JONG_TO_TAG[d.jong];
    // 받침 떼고 본음절 먼저 push
    out += composeHangul(d.cho, d.jung, 0);
    if (!tag) continue;
    // 뒤에 "모음 덧붙인 보조음절"을 추가
    const tail = mapFn(tag);
    out += tail;
  }
  return out;
}

// 영어 억양 느낌: 받침을 'ㅡ/어' 계열로 풀어 발음 + 리듬(쉼표/하이픈)
function stylizeEnKoPron(s) {
  // 1) 받침 풀어 발음
  const exploded = _explodeBatchimKo(s, (tag) => {
    if (tag === 'G' || tag === 'GG' || tag === 'K') return '그';
    if (tag === 'D' || tag === 'T') return '드';
    if (tag === 'B' || tag === 'P') return '브';
    if (tag === 'L') return '르';
    if (tag === 'M') return '므';
    if (tag === 'N') return '느';
    if (tag === 'S' || tag === 'SS' || tag === 'J' || tag === 'C' || tag === 'H') return '즈';
    if (tag === 'NG') return '응';
    return '으';
  });
  // 2) 약간 굴리는 리듬: 2~3음절마다 쉼표/하이픈 삽입
  const syl = exploded.split('');
  for (let i=3; i<syl.length; i+=3) syl.splice(i, 0, ', ');
  return syl.join('');
}

// 일본 억양 느낌: 받침을 '우/오/츠/루/누/무' 쪽으로 풀고 귀엽게 '~' 붙이기
function stylizeJaKoPron(s) {
  const exploded = _explodeBatchimKo(s, (tag) => {
    if (tag === 'G' || tag === 'GG' || tag === 'K') return '쿠';
    if (tag === 'D' || tag === 'T') return '토';
    if (tag === 'B' || tag === 'P') return '푸';
    if (tag === 'L') return '루';
    if (tag === 'M') return '무';
    if (tag === 'N') return '누';
    if (tag === 'S' || tag === 'SS' || tag === 'J' || tag === 'C' || tag === 'H') return '츠';
    if (tag === 'NG') return '응';
    return '우';
  });
  // 2) 어미를 살짝 귀엽게
  let cute = exploded;
  // 문장 끝에 '~' 한 번 추가 (중복 방지)
  if (!/[~！!]/.test(cute.trim().slice(-1))) cute += '~';
  // 3) 너무 빠르게 읽히면 중간중간 작은 쉼표
  const syl = cute.split('');
  for (let i=4; i<syl.length; i+=4) syl.splice(i, 0, ', ');
  return syl.join('');
}

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
    setTtsKey((k) => k + 1);
  }, []);

  const renderItem = ({ item }) => {
    const showRoma = lang === "en"; // 영어 UI에서만 ROMA 노출
    const showKana = lang === "ja"; // 일본어 UI에서만 가타카나 발음 라인 노출
    
    // ㅇㅈ 같은 줄임말은 실제 한글로 TTS 재생
    const getKoSound = () => {
      if (item.ko === "ㅇㅈ") return "인정";
      if (item.ko === "ㄹㅇ") return "레알";
      if (item.ko === "ㅋㅋ루삥뽕") return "쿠쿠루삥뽕";
      return item.ko;
    };
    
    // 영어 로마자를 한국어 TTS로 한국인 영어 발음 느낌으로 읽기
    const getEnSound = () => {
      const ttsData = SLANG_TTS[cat]?.[item.id];
      return ttsData?.ko_tts_en || item.ko;
    };
    
    // 일본어 가타카나를 한국어 TTS로 한국인 일본어 발음 느낌으로 읽기
    const getJaSound = () => {
      const ttsData = SLANG_TTS[cat]?.[item.id];
      return ttsData?.ko_tts_ja || item.ko;
    };
    
    return (
      <View style={styles.card}>
        {/* KO 원문 타이틀 */}
        <Text style={[styles.ko, { fontFamily: font }]}>{item.ko}</Text>

        {/* KO 원문 → 한국어 억양 */}
        <View style={styles.line}>
          <Text style={[styles.label, { fontFamily: font }]}>[KO]</Text>
          <Text style={[styles.txt, { fontFamily: font }]}>{item.ko}</Text>
          <TouchableOpacity style={styles.play} onPress={() => onSpeak(getKoSound(), "ko")}>
            <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
          </TouchableOpacity>
        </View>

        {/* EN UI일 때: 로마자 발음(한국인 영어 발음 느낌) + 영어 의미 */}
        {showRoma && (
          <View style={styles.line}>
            <Text style={[styles.label, { fontFamily: font }]}>[ROMA]</Text>
            <Text style={[styles.txt, { fontFamily: font }]}>
              {item.romaEn} — {item.en}
            </Text>
            <TouchableOpacity style={styles.play} onPress={() => onSpeak(getEnSound(), "ko")}>
              <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EN 의미 → (요청) 매핑된 한국어 억양으로 읽기 */}
        <View style={styles.line}>
          <Text style={[styles.label, { fontFamily: font }]}>[EN]</Text>
          <Text style={[styles.txt, { fontFamily: font }]}>{item.en}</Text>
          <TouchableOpacity style={styles.play} onPress={() => onSpeak(getEnSound(), "ko")}>
            <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
          </TouchableOpacity>
        </View>

        {/* JA UI일 때: 가타카나 발음(한국인 일본어 발음 느낌) + 일본어 의미 */}
        {showKana && (
          <View style={styles.line}>
            <Text style={[styles.label, { fontFamily: font }]}>[JA-読み]</Text>
            <Text style={[styles.txt, { fontFamily: font }]}>{item.kanaJa}</Text>
            <TouchableOpacity style={styles.play} onPress={() => onSpeak(getJaSound(), "ko")}>
              <Text style={[styles.playTxt, { fontFamily: font }]}>▶ {t.play}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* JA 의미 → (요청) 매핑된 한국어 억양으로 읽기 */}
        <View style={styles.line}>
          <Text style={[styles.label, { fontFamily: font }]}>[JA]</Text>
          <Text style={[styles.txt, { fontFamily: font }]}>{item.ja}</Text>
          <TouchableOpacity style={styles.play} onPress={() => onSpeak(getJaSound(), "ko")}>
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
  card: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 4 },
  ko: { fontSize: 18, color: "#111" },
  line: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" },
  label: { fontSize: 12, color: "#999", width: 64 },
  txt: { flexShrink: 1, fontSize: 14, color: "#222" },
  play: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "#111", marginLeft: "auto" },
  playTxt: { color: "#fff", fontSize: 12 },
});
