export function searchStatusMessage(reason: string | null): string {
  switch (reason) {
    case null:
      return "Kết quả kết hợp tìm từ khóa và tìm thông minh.";
    case "disabled":
      return "Tìm thông minh chưa sẵn sàng. Đang hiển thị kết quả theo từ khóa.";
    case "index_empty":
      return "Nội dung tìm thông minh đang được chuẩn bị. Đang tìm theo từ khóa.";
    case "unsupported_filter":
      return "Tìm thông minh hiện hỗ trợ Bài hát. Bộ lọc này đang tìm theo từ khóa.";
    case "busy":
      return "Tìm thông minh đang bận. Đang hiển thị kết quả theo từ khóa.";
    default:
      return "Tạm thời dùng tìm kiếm từ khóa. Bạn có thể thử tìm thông minh lại sau.";
  }
}
