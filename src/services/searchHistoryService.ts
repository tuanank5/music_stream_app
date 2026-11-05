import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSearchHistoryService } from "../utils/searchHistory";

export const searchHistoryService = createSearchHistoryService(AsyncStorage);
