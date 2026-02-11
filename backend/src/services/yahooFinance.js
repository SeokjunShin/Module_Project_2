/**
 * Yahoo Finance Service (v3)
 * Yahoo Finance API를 통한 주식 데이터 조회
 * [A02: Security Misconfiguration] API 키 없이 사용
 * [A05: Injection] 입력 검증 없음
 */

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

// 환율 (USD 기준)
const EXCHANGE_RATES = {
  'KRW': 1350,    // 1 USD = 1350 KRW
  'JPY': 150,     // 1 USD = 150 JPY
  'EUR': 0.92,    // 1 USD = 0.92 EUR
  'GBP': 0.79,    // 1 USD = 0.79 GBP
  'CNY': 7.2,     // 1 USD = 7.2 CNY
  'USD': 1
};

/**
 * 통화를 USD로 변환
 */
function convertToUSD(price, currency) {
  const rate = EXCHANGE_RATES[currency] || 1;
  return price / rate;
}

/**
 * 종목 검색
 * @param {string} query - 검색어
 * @returns {Promise<Array>}
 */
async function searchStocks(query) {
  try {
    // [A05: Injection] 입력 검증 없음
    const result = await yahooFinance.search(query, {
      quotesCount: 20,
      newsCount: 0
    });
    
    return result.quotes.map(q => ({
      symbol: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      exchange: q.exchange,
      type: q.quoteType,
      score: q.score
    }));
  } catch (error) {
    console.error('Yahoo search error:', error.message);
    return [];
  }
}

/**
 * 현재가 조회
 * @param {string} symbol - 종목 심볼
 * @returns {Promise<Object>}
 * [A10: Exceptional Conditions] 특수 심볼 처리 오류
 */
async function getQuote(symbol) {
  try {
    // [A10] 특수문자가 포함된 심볼은 API 에러 유발
    // 공격자가 의도적으로 에러를 발생시켜 0.01달러 가격 적용받을 수 있음
    if (symbol.includes('$') || symbol.includes('#') || symbol.includes('!')) {
      console.log(`[A10 VULN] Special character in symbol: ${symbol}, API will fail`);
      throw new Error(`Invalid symbol format: ${symbol}`);
    }
    
    const quote = await yahooFinance.quote(symbol);
    
    // 원본 통화와 가격
    const originalCurrency = quote.currency || 'USD';
    const originalPrice = quote.regularMarketPrice;
    
    // USD로 환산
    const priceUSD = convertToUSD(originalPrice, originalCurrency);
    const changeUSD = convertToUSD(quote.regularMarketChange || 0, originalCurrency);
    const previousCloseUSD = convertToUSD(quote.regularMarketPreviousClose || 0, originalCurrency);
    const openUSD = convertToUSD(quote.regularMarketOpen || 0, originalCurrency);
    const highUSD = convertToUSD(quote.regularMarketDayHigh || 0, originalCurrency);
    const lowUSD = convertToUSD(quote.regularMarketDayLow || 0, originalCurrency);
    const fiftyTwoWeekHighUSD = convertToUSD(quote.fiftyTwoWeekHigh || 0, originalCurrency);
    const fiftyTwoWeekLowUSD = convertToUSD(quote.fiftyTwoWeekLow || 0, originalCurrency);
    const marketCapUSD = convertToUSD(quote.marketCap || 0, originalCurrency);
    
    return {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      price: Number(priceUSD.toFixed(2)),
      change: Number(changeUSD.toFixed(2)),
      changePercent: quote.regularMarketChangePercent,
      previousClose: Number(previousCloseUSD.toFixed(2)),
      open: Number(openUSD.toFixed(2)),
      high: Number(highUSD.toFixed(2)),
      low: Number(lowUSD.toFixed(2)),
      volume: quote.regularMarketVolume,
      marketCap: Number(marketCapUSD.toFixed(0)),
      fiftyTwoWeekHigh: Number(fiftyTwoWeekHighUSD.toFixed(2)),
      fiftyTwoWeekLow: Number(fiftyTwoWeekLowUSD.toFixed(2)),
      currency: 'USD',  // 모든 가격은 USD로 변환됨
      originalCurrency: originalCurrency,
      exchange: quote.exchange,
      marketState: quote.marketState,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`Yahoo quote error for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * 여러 종목 현재가 조회
 * @param {string[]} symbols - 종목 심볼 배열
 * @returns {Promise<Object>}
 */
async function getQuotes(symbols) {
  try {
    const results = {};
    
    // 병렬 조회
    const quotes = await Promise.allSettled(
      symbols.map(symbol => getQuote(symbol))
    );
    
    quotes.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[symbols[index]] = result.value;
      }
    });
    
    return results;
  } catch (error) {
    console.error('Yahoo quotes error:', error.message);
    return {};
  }
}

/**
 * 차트 데이터 조회
 * @param {string} symbol - 종목 심볼
 * @param {string} period - 기간 (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max)
 * @param {string} interval - 간격 (1m, 2m, 5m, 15m, 30m, 1h, 1d, 5d, 1wk, 1mo)
 * @returns {Promise<Array>}
 */
async function getChart(symbol, period = '1mo', interval = '1d') {
  try {
    const result = await yahooFinance.chart(symbol, {
      period1: getStartDate(period),
      interval: interval
    });
    
    if (!result.quotes || result.quotes.length === 0) {
      return [];
    }
    
    // 통화 확인 및 환율 적용
    const currency = result.meta?.currency || 'USD';
    const rate = EXCHANGE_RATES[currency] || 1;
    
    return result.quotes.map(q => ({
      date: q.date,
      open: q.open ? Number((q.open / rate).toFixed(2)) : null,
      high: q.high ? Number((q.high / rate).toFixed(2)) : null,
      low: q.low ? Number((q.low / rate).toFixed(2)) : null,
      close: q.close ? Number((q.close / rate).toFixed(2)) : null,
      volume: q.volume
    })).filter(q => q.close !== null);
  } catch (error) {
    console.error(`Yahoo chart error for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * 기간에 따른 시작 날짜 계산
 */
function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case '1d': return new Date(now.setDate(now.getDate() - 1));
    case '5d': return new Date(now.setDate(now.getDate() - 5));
    case '1mo': return new Date(now.setMonth(now.getMonth() - 1));
    case '3mo': return new Date(now.setMonth(now.getMonth() - 3));
    case '6mo': return new Date(now.setMonth(now.getMonth() - 6));
    case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
    case '2y': return new Date(now.setFullYear(now.getFullYear() - 2));
    case '5y': return new Date(now.setFullYear(now.getFullYear() - 5));
    default: return new Date(now.setMonth(now.getMonth() - 1));
  }
}

/**
 * 주요 지수 조회
 */
async function getMarketIndices() {
  const indices = [
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^DJI', name: 'Dow Jones' },
    { symbol: '^IXIC', name: 'NASDAQ' },
    { symbol: '^KS11', name: 'KOSPI' },
    { symbol: '^KQ11', name: 'KOSDAQ' },
    { symbol: '^N225', name: 'Nikkei 225' }
  ];
  
  try {
    const results = await Promise.allSettled(
      indices.map(idx => getQuote(idx.symbol))
    );
    
    return indices.map((idx, i) => {
      if (results[i].status === 'fulfilled') {
        return {
          ...idx,
          ...results[i].value
        };
      }
      return idx;
    });
  } catch (error) {
    console.error('Market indices error:', error.message);
    return indices;
  }
}

/**
 * 인기 종목 / 상승/하락 종목
 */
async function getTrendingStocks() {
  try {
    // 인기 종목 목록
    const trending = await yahooFinance.trendingSymbols('US', { count: 20 });
    
    if (!trending.quotes) {
      return { gainers: [], losers: [], active: [] };
    }
    
    const symbols = trending.quotes.map(q => q.symbol);
    const quotes = await getQuotes(symbols);
    
    const sortedByChange = Object.values(quotes)
      .filter(q => q.changePercent !== undefined)
      .sort((a, b) => b.changePercent - a.changePercent);
    
    return {
      gainers: sortedByChange.slice(0, 5),
      losers: sortedByChange.slice(-5).reverse(),
      active: sortedByChange.slice(0, 10)
    };
  } catch (error) {
    console.error('Trending stocks error:', error.message);
    return { gainers: [], losers: [], active: [] };
  }
}

/**
 * 종목 상세 정보
 */
async function getStockDetails(symbol) {
  try {
    const [quote, summary] = await Promise.all([
      getQuote(symbol),
      yahooFinance.quoteSummary(symbol, {
        modules: ['summaryProfile', 'financialData', 'defaultKeyStatistics']
      }).catch(() => null)
    ]);
    
    return {
      ...quote,
      profile: summary?.summaryProfile || null,
      financials: summary?.financialData || null,
      keyStats: summary?.defaultKeyStatistics || null
    };
  } catch (error) {
    console.error(`Stock details error for ${symbol}:`, error.message);
    throw error;
  }
}

module.exports = {
  searchStocks,
  getQuote,
  getQuotes,
  getChart,
  getMarketIndices,
  getTrendingStocks,
  getStockDetails
};
