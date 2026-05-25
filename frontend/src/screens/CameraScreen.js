import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import { s } from "../styles";

export default function CameraScreen({
  camRef,
  facing,
  flash,
  pulse,
  onToggleFlash,
  onToggleFacing,
  onCapture,
  onPickGallery,
}) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash ? "on" : "off"}
      />

      <View style={s.frame} pointerEvents="none">
        {[s.cTL, s.cTR, s.cBL, s.cBR].map((cs, i) => (
          <View key={i} style={cs} />
        ))}
        <Text style={s.frameHint}>Align document within frame</Text>
      </View>

      <SafeAreaView style={s.topBar}>
        <Text style={s.appName}>DOC · SCAN</Text>
        <View style={s.topBtns}>
          <TouchableOpacity style={s.iconBtn} onPress={onToggleFlash}>
            <Text style={s.iconBtnTxt}>{flash ? "⚡" : "🔦"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={onToggleFacing}>
            <Text style={s.iconBtnTxt}>🔄</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.gallBtn} onPress={onPickGallery}>
          <Text style={{ fontSize: 26 }}>🖼️</Text>
          <Text style={s.gallTxt}>Gallery</Text>
        </TouchableOpacity>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity style={s.capBtn} onPress={onCapture}>
            <View style={s.capInner} />
          </TouchableOpacity>
        </Animated.View>
        <View style={{ width: 60 }} />
      </View>
    </View>
  );
}
