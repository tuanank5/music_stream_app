import { Redirect } from "expo-router";
import WelcomeScreen from "../screens/WelcomeScreen";
import { Loading } from "../components/ui/index";
import { useAuth } from "../contexts/AuthContext";
export default function Route() {
  const { user, loading, error } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Redirect href="/home" />;
  return <WelcomeScreen error={error} />;
}
