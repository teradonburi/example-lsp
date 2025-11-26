import { DiagnosticSeverity } from 'vscode-languageserver/node'
import {
  findLineForKey,
  parseYamlText,
  validateConfig,
  validateText,
  createDiagnostic,
  REQUIRED_FIELDS,
  FIELD_DOCS,
} from './validator'

describe('validator', () => {
  describe('findLineForKey', () => {
    it('should find the line number for a key at root level', () => {
      const text = `name: test
version: "1.0.0"
enabled: true`
      expect(findLineForKey(text, 'name')).toBe(0)
      expect(findLineForKey(text, 'version')).toBe(1)
      expect(findLineForKey(text, 'enabled')).toBe(2)
    })

    it('should find the line number for a nested key', () => {
      const text = `name: test
settings:
  timeout: 30
  retries: 3`
      expect(findLineForKey(text, 'timeout')).toBe(2)
      expect(findLineForKey(text, 'retries')).toBe(3)
    })

    it('should return 0 if key is not found', () => {
      const text = `name: test`
      expect(findLineForKey(text, 'nonexistent')).toBe(0)
    })

    it('should handle keys with various spacing', () => {
      const text = `name: test
  version: "1.0.0"
    enabled: true`
      expect(findLineForKey(text, 'version')).toBe(1)
      expect(findLineForKey(text, 'enabled')).toBe(2)
    })
  })

  describe('parseYamlText', () => {
    it('should parse valid YAML', () => {
      const text = `name: test
version: "1.0.0"`
      const result = parseYamlText(text)
      expect(result.error).toBeNull()
      expect(result.parsed).toEqual({
        name: 'test',
        version: '1.0.0',
      })
    })

    it('should return error for invalid YAML', () => {
      const text = `name: test
  invalid: [unclosed`
      const result = parseYamlText(text)
      expect(result.error).not.toBeNull()
      expect(result.parsed).toBeNull()
    })

    it('should handle empty text', () => {
      const result = parseYamlText('')
      expect(result.error).toBeNull()
      expect(result.parsed).toBeNull()
    })
  })

  describe('createDiagnostic', () => {
    it('should create a diagnostic with correct properties', () => {
      const diagnostic = createDiagnostic(DiagnosticSeverity.Error, 5, 'Test message')

      expect(diagnostic.severity).toBe(DiagnosticSeverity.Error)
      expect(diagnostic.message).toBe('Test message')
      expect(diagnostic.source).toBe('myconfig-lsp')
      expect(diagnostic.range.start.line).toBe(5)
      expect(diagnostic.range.end.line).toBe(5)
    })
  })

  describe('validateConfig', () => {
    it('should return error for missing required fields', () => {
      const config = {}
      const text = ''
      const diagnostics = validateConfig(config, text)

      expect(diagnostics).toHaveLength(2)
      expect(diagnostics[0].message).toContain('name')
      expect(diagnostics[1].message).toContain('version')
    })

    it('should return error for missing name field only', () => {
      const config = { version: '1.0.0' }
      const text = 'version: "1.0.0"'
      const diagnostics = validateConfig(config, text)

      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].message).toContain('name')
    })

    it('should return error for missing version field only', () => {
      const config = { name: 'test' }
      const text = 'name: test'
      const diagnostics = validateConfig(config, text)

      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].message).toContain('version')
    })

    it('should return no errors for valid config', () => {
      const config = { name: 'test', version: '1.0.0' }
      const text = `name: test
version: "1.0.0"`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics).toHaveLength(0)
    })

    it('should return error when name is not a string', () => {
      const config = { name: 123, version: '1.0.0' }
      const text = `name: 123
version: "1.0.0"`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics.some(d => d.message.includes('name') && d.message.includes('文字列'))).toBe(true)
    })

    it('should return error when version is not a string', () => {
      const config = { name: 'test', version: 1.0 }
      const text = `name: test
version: 1.0`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics.some(d => d.message.includes('version') && d.message.includes('文字列'))).toBe(true)
    })

    it('should return warning when enabled is not a boolean', () => {
      const config = { name: 'test', version: '1.0.0', enabled: 'yes' }
      const text = `name: test
version: "1.0.0"
enabled: "yes"`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning)
      expect(diagnostics[0].message).toContain('enabled')
    })

    it('should accept valid boolean for enabled', () => {
      const config = { name: 'test', version: '1.0.0', enabled: true }
      const text = `name: test
version: "1.0.0"
enabled: true`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics).toHaveLength(0)
    })

    it('should return error when settings is not an object', () => {
      const config = { name: 'test', version: '1.0.0', settings: 'invalid' }
      const text = `name: test
version: "1.0.0"
settings: invalid`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics.some(d => d.message.includes('settings') && d.message.includes('オブジェクト'))).toBe(true)
    })

    it('should return warning when timeout is not a number', () => {
      const config = {
        name: 'test',
        version: '1.0.0',
        settings: { timeout: '30' },
      }
      const text = `name: test
version: "1.0.0"
settings:
  timeout: "30"`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics.some(d => d.message.includes('timeout') && d.message.includes('数値'))).toBe(true)
    })

    it('should return warning when retries is not a number', () => {
      const config = {
        name: 'test',
        version: '1.0.0',
        settings: { retries: 'three' },
      }
      const text = `name: test
version: "1.0.0"
settings:
  retries: "three"`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics.some(d => d.message.includes('retries') && d.message.includes('数値'))).toBe(true)
    })

    it('should return warning when retries is negative', () => {
      const config = {
        name: 'test',
        version: '1.0.0',
        settings: { retries: -1 },
      }
      const text = `name: test
version: "1.0.0"
settings:
  retries: -1`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics.some(d => d.message.includes('retries') && d.message.includes('0以上'))).toBe(true)
    })

    it('should accept valid settings', () => {
      const config = {
        name: 'test',
        version: '1.0.0',
        settings: { timeout: 30, retries: 3 },
      }
      const text = `name: test
version: "1.0.0"
settings:
  timeout: 30
  retries: 3`
      const diagnostics = validateConfig(config, text)

      expect(diagnostics).toHaveLength(0)
    })
  })

  describe('validateText', () => {
    it('should return empty array for empty text', () => {
      const diagnostics = validateText('')
      expect(diagnostics).toHaveLength(0)
    })

    it('should return empty array for whitespace only', () => {
      const diagnostics = validateText('   \n\n   ')
      expect(diagnostics).toHaveLength(0)
    })

    it('should return error for invalid YAML syntax', () => {
      const text = `name: test
  invalid: [unclosed`
      const diagnostics = validateText(text)

      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].message).toContain('YAML構文エラー')
    })

    it('should return error when root is not an object', () => {
      const text = '- item1\n- item2'
      const diagnostics = validateText(text)

      expect(diagnostics.some(d => d.message.includes('ルート要素'))).toBe(true)
    })

    it('should return error for scalar root', () => {
      const text = 'just a string'
      const diagnostics = validateText(text)

      expect(diagnostics.some(d => d.message.includes('ルート要素'))).toBe(true)
    })

    it('should validate a complete valid config', () => {
      const text = `name: my-app
version: "1.0.0"
enabled: true
settings:
  timeout: 30
  retries: 3`
      const diagnostics = validateText(text)

      expect(diagnostics).toHaveLength(0)
    })

    it('should return multiple errors for invalid config', () => {
      const text = `enabled: "yes"
settings:
  timeout: "30秒"`
      const diagnostics = validateText(text)

      // Missing name, missing version, enabled not boolean, timeout not number
      expect(diagnostics.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('constants', () => {
    it('should have required fields defined', () => {
      expect(REQUIRED_FIELDS).toContain('name')
      expect(REQUIRED_FIELDS).toContain('version')
    })

    it('should have field docs for all required fields', () => {
      for (const field of REQUIRED_FIELDS) {
        expect(FIELD_DOCS[field]).toBeDefined()
        expect(FIELD_DOCS[field].required).toBe(true)
      }
    })

    it('should have field docs for optional fields', () => {
      expect(FIELD_DOCS['enabled']).toBeDefined()
      expect(FIELD_DOCS['enabled'].required).toBe(false)

      expect(FIELD_DOCS['settings']).toBeDefined()
      expect(FIELD_DOCS['settings'].required).toBe(false)

      expect(FIELD_DOCS['timeout']).toBeDefined()
      expect(FIELD_DOCS['timeout'].required).toBe(false)

      expect(FIELD_DOCS['retries']).toBeDefined()
      expect(FIELD_DOCS['retries'].required).toBe(false)
    })
  })
})
