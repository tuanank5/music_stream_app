import React, { useState } from "react";
import { Image, Text, View } from "react-native";
export default function Artwork({
  uri,
  size = 54,
  radius = 10,
}: {
  uri: string;
  size?: number;
  radius?: number;
}) {
  const [failedUri, setFailedUri] = useState("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: "#e6f1ef",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {uri && failedUri !== uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <Text style={{ fontSize: size / 3, color: "#087e78" }}>♫</Text>
      )}
    </View>
  );
}
