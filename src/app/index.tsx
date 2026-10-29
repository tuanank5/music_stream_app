import { ImageBackground, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { Button, ErrorText, Loading } from "../components/UI";

export default function Welcome() {
  const { user, loading, error } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Redirect href="/home" />;
  return (
    <ImageBackground
      source={require("../../assets/images/Launch Screen/Image 30.png")}
      style={{ flex: 1, backgroundColor: "#403553" }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#230c4270",
          padding: 25,
          justifyContent: "flex-end",
        }}
      >
        <Text
          style={{
            fontSize: 36,
            fontWeight: "800",
            color: "white",
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          Your music{"\n"}Your artists
        </Text>
        <ErrorText message={error} />
        <Button
          title="Tạo tài khoản"
          onPress={() => router.push("/register")}
        />
        <Button
          title="Tôi đã có tài khoản"
          secondary
          onPress={() => router.push("/login")}
        />
      </View>
    </ImageBackground>
  );
}
