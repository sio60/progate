import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function HeaderLogo({ source = require('../assets/icons/home.png') }) {
  return (
    <View style={styles.logoWrapper}>
      <Image source={source} style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  logoWrapper: { alignItems: 'center', marginBottom: 2, marginTop: -10 },
  logo: { width: 120, height: 120, resizeMode: 'contain' },
});
