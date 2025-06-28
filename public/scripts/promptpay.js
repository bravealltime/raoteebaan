// CRC16 XMODEM implementation
function crc16xmodem(data, initial) {
  if (typeof data === 'string') {
    // Convert string to byte array for browser compatibility
    data = new TextEncoder().encode(data)
  }
  
  let crc = initial || 0x0000
  
  for (let i = 0; i < data.length; i++) {
    crc ^= (data[i] << 8)
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
      crc &= 0xFFFF
    }
  }
  return crc
}

// Main ThaiQRCode object
const ThaiQRCode = {
  // PromptPay constants
  ID_PAYLOAD_FORMAT: '00',
  ID_POI_METHOD: '01',
  ID_MERCHANT_INFORMATION_BOT: '29',
  ID_TRANSACTION_CURRENCY: '53',
  ID_TRANSACTION_AMOUNT: '54',
  ID_COUNTRY_CODE: '58',
  ID_CRC: '63',

  PAYLOAD_FORMAT_EMV_QRCPS_MERCHANT_PRESENTED_MODE: '01',
  POI_METHOD_STATIC: '11',
  POI_METHOD_DYNAMIC: '12',
  MERCHANT_INFORMATION_TEMPLATE_ID_GUID: '00',
  BOT_ID_MERCHANT_PHONE_NUMBER: '01',
  BOT_ID_MERCHANT_TAX_ID: '02',
  BOT_ID_MERCHANT_EWALLET_ID: '03',
  GUID_PROMPTPAY: 'A000000677010111',
  TRANSACTION_CURRENCY_THB: '764',
  COUNTRY_CODE_TH: 'TH',

  // PromptPay payload generation functions
  generatePayload: function(target, options) {
    target = this.sanitizeTarget(target)

    var amount = options.amount
    var targetType = (
      target.length >= 15 ? (
        this.BOT_ID_MERCHANT_EWALLET_ID
      ) : target.length >= 13 ? (
        this.BOT_ID_MERCHANT_TAX_ID
      ) : (
        this.BOT_ID_MERCHANT_PHONE_NUMBER
      )
    )

    var data = [
      this.f(this.ID_PAYLOAD_FORMAT, this.PAYLOAD_FORMAT_EMV_QRCPS_MERCHANT_PRESENTED_MODE),
      this.f(this.ID_POI_METHOD, amount ? this.POI_METHOD_DYNAMIC : this.POI_METHOD_STATIC),
      this.f(this.ID_MERCHANT_INFORMATION_BOT, this.serialize([
        this.f(this.MERCHANT_INFORMATION_TEMPLATE_ID_GUID, this.GUID_PROMPTPAY),
        this.f(targetType, this.formatTarget(target))
      ])),
      this.f(this.ID_COUNTRY_CODE, this.COUNTRY_CODE_TH),
      this.f(this.ID_TRANSACTION_CURRENCY, this.TRANSACTION_CURRENCY_THB),
      amount && this.f(this.ID_TRANSACTION_AMOUNT, this.formatAmount(amount))
    ]
    
    var dataToCrc = this.serialize(data) + this.ID_CRC + '04'
    data.push(this.f(this.ID_CRC, this.formatCrc(crc16xmodem(dataToCrc, 0xffff))))
    return this.serialize(data)
  },

  f: function(id, value) {
    return [id, ('00' + value.length).slice(-2), value].join('')
  },

  serialize: function(xs) {
    return xs.filter(function (x) { return x }).join('')
  },

  sanitizeTarget: function(id) {
    return id.replace(/[^0-9]/g, '')
  },

  formatTarget: function(id) {
    const numbers = this.sanitizeTarget(id)
    if (numbers.length >= 13) return numbers
    return ('0000000000000' + numbers.replace(/^0/, '66')).slice(-13)
  },

  formatAmount: function(amount) {
    return amount.toFixed(2)
  },

  formatCrc: function(crcValue) {
    return ('0000' + crcValue.toString(16).toUpperCase()).slice(-4)
  },

  // Main QR generation function using external QR library
  generate: function(target, options = {}) {
    try {
      // Generate PromptPay payload
      const payload = this.generatePayload(target, options);
      console.log('Generated payload:', payload);
      
      // Check if QR library is available
      if (typeof qrcode === 'undefined') {
        throw new Error('QR Code library not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.5.0/qrcode.min.js"></script>');
      }
      
      // Create QR code using external library
      const typeNumber = 0; // Auto-detect
      const errorCorrectionLevel = 'M';
      const qr = qrcode(typeNumber, errorCorrectionLevel);
      qr.addData(payload);
      qr.make();
      
      // Generate canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const moduleCount = qr.getModuleCount();
      const scale = options.scale || 8;
      const margin = options.margin || 2;
      
      const totalSize = (moduleCount + margin * 2) * scale;
      canvas.width = totalSize;
      canvas.height = totalSize;
      
      // Fill white background
      ctx.fillStyle = options.light || '#FFFFFF';
      ctx.fillRect(0, 0, totalSize, totalSize);
      
      // Draw QR modules
      ctx.fillStyle = options.dark || '#000000';
      
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            const x = (col + margin) * scale;
            const y = (row + margin) * scale;
            ctx.fillRect(x, y, scale, scale);
          }
        }
      }
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  },
  
  // Synchronous version
  generateSync: function(target, options = {}) {
    return this.generate(target, options);
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.ThaiQRCode = ThaiQRCode;
}