/**
 * 测试环境准备：注入 fake-indexeddb，
 * 使仓储层可以在 Node 环境下被真实测试（不依赖浏览器）。
 */
import 'fake-indexeddb/auto';
