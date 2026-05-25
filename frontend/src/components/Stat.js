import React from "react";
import { View, Text } from "react-native";
import { s } from "../styles";

export default function Stat({ icon, label, value, color }) {
  return (
    <View style={[s.stat, { borderColor: color + "44" }]}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
