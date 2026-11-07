import { describe, expect, it } from 'vitest'
import { errorMessage, passwordError } from './validation'

describe('password validation', () => {
  it('rejects short passwords', () => expect(passwordError('abc123', 'abc123')).toContain('8 ký tự'))
  it('requires letters and numbers', () => {
    expect(passwordError('abcdefgh', 'abcdefgh')).toContain('chữ và số')
    expect(passwordError('12345678', '12345678')).toContain('chữ và số')
  })
  it('rejects mismatched confirmation', () => expect(passwordError('secret123', 'secret124')).toContain('chưa khớp'))
  it('accepts a valid matching password', () => expect(passwordError('secret123!', 'secret123!')).toBeNull())
})

describe('auth errors', () => {
  it('translates invalid credentials without disclosing which field is wrong', () => expect(errorMessage(new Error('Invalid login credentials'))).toBe('Email hoặc mật khẩu không chính xác.'))
  it('provides a fallback for unexpected errors', () => expect(errorMessage(null)).toContain('Vui lòng thử lại'))
})
