import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const COL_WIDTH = Math.floor((width - 32) / 4);
const FOOTER_FONT = { ko: 20, en: 10, ja: 10 };

export default function FooterNav({ t, lang, onOpenSettings, fontFamily }) {
  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.footerIcon}>
        <Image source={require('../assets/icons/recipe.png')} style={styles.iconImg} />
        <Text style={[styles.footerText, { fontFamily, fontSize: FOOTER_FONT[lang] }]} numberOfLines={2}>
          {t.navIngredients}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerIcon}>
        <Image source={require('../assets/icons/search.png')} style={styles.iconImg} />
        <Text style={[styles.footerText, { fontFamily, fontSize: FOOTER_FONT[lang] }]} numberOfLines={2}>
          {t.navSearch}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerIcon}>
        <Image source={require('../assets/icons/watch.png')} style={styles.iconImg} />
        <Text style={[styles.footerText, { fontFamily, fontSize: FOOTER_FONT[lang] }]} numberOfLines={2}>
          {t.navBrowse}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerIcon} onPress={onOpenSettings}>
        <Image source={require('../assets/icons/set.png')} style={styles.iconImg} />
        <Text style={[styles.footerText, { fontFamily, fontSize: FOOTER_FONT[lang] }]} numberOfLines={2}>
          {t.navSettings}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#fff' },
  footerIcon: { alignItems: 'center', width: COL_WIDTH, paddingHorizontal: 4 },
  iconImg: { width: 24, height: 24, marginBottom: 4, resizeMode: 'contain' },
  footerText: { color: '#333', textAlign: 'center', lineHeight: 14 },
});
