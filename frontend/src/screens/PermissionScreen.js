import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { s } from "../styles";

export default function PermissionScreen({ onRequestPermission }) {
  return (
    <SafeAreaView style={s.permWrap}>
      <Text style={s.permIcon}>📷</Text>
      <Text style={s.permTitle}>Camera Access Needed</Text>
      <TouchableOpacity style={s.permBtn} onPress={onRequestPermission}>
        <Text style={s.permBtnTxt}>Grant Permission</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
