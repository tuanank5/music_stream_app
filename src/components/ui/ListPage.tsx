import { type ReactElement, type ReactNode } from "react";
import { FlatList } from "react-native";
import { YStack } from "tamagui";
import { PageContent } from "./Page";
import { ScreenHeader } from "./ScreenHeader";
type ListPageProps<T> = {
  title?: string;
  titleLeading?: ReactNode;
  titleTrailing?: ReactNode;
  data: readonly T[];
  renderItem: (item: T, index: number) => ReactElement;
  keyExtractor: (item: T, index: number) => string;
  header?: ReactNode;
  footer?: ReactNode;
  contentWidth?: "form" | "reading" | "full";
  onEndReached?: () => void;
};
// The list owns vertical scrolling; never mount this inside Page's ScrollView.
export function ListPage<T>({
  title,
  titleLeading,
  titleTrailing,
  data,
  renderItem,
  keyExtractor,
  header,
  footer,
  contentWidth = "full",
  onEndReached,
}: ListPageProps<T>) {
  const maxWidth =
    contentWidth === "form"
      ? "480px"
      : contentWidth === "reading"
        ? "820px"
        : "1000px";
  return (
    <YStack
      flex={1}
      minHeight={0}
      overflow="hidden"
      backgroundColor="background"
    >
      <FlatList
        style={{ flex: 1 }}
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) => (
          <PageContent maxWidth={maxWidth} paddingHorizontal="gutter">
            {renderItem(item, index)}
          </PageContent>
        )}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <PageContent
            maxWidth={maxWidth}
            paddingHorizontal="gutter"
            paddingTop="gutter"
          >
            {title ? (
              <ScreenHeader
                title={title}
                leading={titleLeading}
                trailing={titleTrailing}
              />
            ) : null}
            {header}
          </PageContent>
        }
        ListFooterComponent={
          <PageContent
            maxWidth={maxWidth}
            paddingHorizontal="gutter"
            paddingBottom="pageBottom"
          >
            {footer}
          </PageContent>
        }
      />
    </YStack>
  );
}
