import React, { useState } from "react";
import { View, Text, Image } from "react-native";
import { s } from "../styles";

export default function PipelineImage({ uri }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <View style={s.noImg}>
        <Text style={{ color: "#FF6B35" }}>Failed to render image</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={s.pipeImg}
      resizeMode="contain"
      onError={() => setErr(true)}
    />
  );
}
