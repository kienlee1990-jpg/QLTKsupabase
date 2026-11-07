export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Mật khẩu cần có ít nhất 8 ký tự.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'Mật khẩu cần có cả chữ và số.'
  if (password !== confirmation) return 'Mật khẩu xác nhận chưa khớp.'
  return null
}

export function errorMessage(error: unknown): string {
  const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.'
  if (/Invalid login credentials/i.test(message)) return 'Email hoặc mật khẩu không chính xác.'
  if (/Email not confirmed/i.test(message)) return 'Vui lòng xác nhận email trước khi đăng nhập.'
  if (/same password/i.test(message)) return 'Mật khẩu mới phải khác mật khẩu hiện tại.'
  if (/fetch|network/i.test(message)) return 'Không thể kết nối. Vui lòng kiểm tra mạng và cấu hình Supabase.'
  if (/rate limit|too many requests/i.test(message)) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một chút.'
  return message
}
