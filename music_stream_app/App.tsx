import React, { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, View } from "react-native";
import BottomNav from "./src/components/BottomNav";
import MiniPlayer from "./src/components/MiniPlayer";
import { colors } from "./src/colors";
import { sampleSongs } from "./src/hooks/useSongs";
import { Song } from "./src/types/Song";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ChartsScreen } from "./src/screens/ChartsScreen";
import { PlayerScreen } from "./src/screens/PlayerScreen";
import { ArtistScreen } from "./src/screens/ArtistScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { SearchResultsScreen } from "./src/screens/SearchResultsScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { CommentsScreen } from "./src/screens/CommentsScreen";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { PlaylistsScreen } from "./src/screens/PlaylistsScreen";
import { PremiumWelcomeScreen } from "./src/screens/PremiumWelcomeScreen";
import { PremiumPlansScreen } from "./src/screens/PremiumPlansScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";

type Screen = "Welcome" | "Home" | "Charts" | "Player" | "Artist" | "Search" | "SearchResults" | "Feed" | "Comments" | "Library" | "Playlists" | "PremiumWelcome" | "PremiumPlans" | "Login" | "Register";
const tabs = ["Home", "Search", "Feed", "Library"];
export default function App() {
  const [screen, setScreen] = useState<Screen>("Welcome");
  const [song, setSong] = useState<Song>(sampleSongs[0]);
  const [playing, setPlaying] = useState(false);
  const [searchText, setSearchText] = useState("");
  const go = (next: string) => setScreen(next as Screen);
  const selectTab = (tab: string) => setScreen(tab as Screen);
  const props = { go, setSong, onPlay: () => setPlaying(v => !v), searchText, setSearchText };
  const noTabs = ["Welcome", "Player", "PremiumWelcome", "PremiumPlans", "Login", "Register"].includes(screen);
  const screenNode = (() => {
    switch (screen) {
      case "Welcome": return <WelcomeScreen {...props}/>;
      case "Home": return <HomeScreen {...props}/>;
      case "Charts": return <ChartsScreen {...props}/>;
      case "Player": return <PlayerScreen {...props}/>;
      case "Artist": return <ArtistScreen {...props}/>;
      case "Search": return <SearchScreen {...props}/>;
      case "SearchResults": return <SearchResultsScreen {...props}/>;
      case "Feed": return <FeedScreen {...props}/>;
      case "Comments": return <CommentsScreen {...props}/>;
      case "Library": return <LibraryScreen {...props}/>;
      case "Playlists": return <PlaylistsScreen {...props}/>;
      case "PremiumWelcome": return <PremiumWelcomeScreen {...props}/>;
      case "PremiumPlans": return <PremiumPlansScreen {...props}/>;
      case "Login": return <LoginScreen {...props}/>;
      case "Register": return <RegisterScreen {...props}/>;
      default: return <HomeScreen {...props}/>;
    }
  })();
  const showMini = !noTabs && ["Home", "Charts", "Artist", "Search", "SearchResults", "Feed", "Library", "Playlists"].includes(screen);
  return <SafeAreaView style={styles.root}><StatusBar barStyle={screen === "Player" || screen.startsWith("Premium") || screen === "Welcome" ? "light-content" : "dark-content"}/>
    <View style={styles.body}>{screenNode}</View>
    {showMini && <MiniPlayer song={song} playing={playing} onToggle={()=>setPlaying(v=>!v)} onOpen={()=>go("Player")}/>}
    {!noTabs && <BottomNav active={tabs.includes(screen) ? screen : (screen==="Charts"||screen==="Artist" ? "Home" : screen==="Comments" ? "Feed" : "Library")} onChange={selectTab}/>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({root:{flex:1,backgroundColor:colors.background},body:{flex:1}});
