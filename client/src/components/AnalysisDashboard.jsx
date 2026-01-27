import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, LabelList
} from 'recharts';

const AnalysisDashboard = () => {
    const { t } = useTranslation();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = () => {
        fetch('/api/analytics/report')
            .then(res => {
                if (!res.ok) throw new Error("No report");
                return res.json();
            })
            .then(data => {
                setReport(data);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchReport();
        const interval = setInterval(fetchReport, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !report) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0f]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-6"></div>
                <p className="text-gray-400 animate-pulse text-lg">{t('loading_analytics')}</p>
            </div>
        );
    }

    if (!report || report.error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-20 text-center animate-fade-in">
                <div className="p-8 rounded-full bg-white/5 mb-8 ring-1 ring-white/10">
                    <i className="ri-search-eye-line text-5xl text-purple-500"></i>
                </div>
                <h2 className="text-3xl font-bold mb-4 text-white">{t('analysis_pending')}</h2>
                <p className="text-gray-400 max-w-lg mx-auto mb-8 text-lg leading-relaxed">
                    {t('ai_gathering_data')}
                </p>
                {report?.error && (
                    <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg">
                        <p className="text-red-400 text-sm font-mono">{report.error}</p>
                    </div>
                )}
                <button onClick={fetchReport} className="mt-4 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 transition text-white font-medium">
                    {t('refresh_data')}
                </button>
            </div>
        );
    }

    const {
        summary = "",
        sentiment_score = 0,
        key_entities = [],
        sources = [],
        timestamp = Date.now() / 1000
    } = report || {};

    // Derived Data for Charts
    const sentimentData = [
        { name: t('positive'), value: sentiment_score > 0 ? sentiment_score * 100 : 0 },
        { name: t('negative'), value: sentiment_score < 0 ? Math.abs(sentiment_score) * 100 : 0 },
        { name: t('neutral'), value: 100 - Math.abs(sentiment_score * 100) }
    ];

    const COLORS = ['#10B981', '#EF4444', '#6B7280'];

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in p-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        {t('intelligence_report')}
                    </h1>
                    <p className="text-gray-400 flex items-center gap-2">
                        <i className="ri-time-line"></i> {t('generated_at')}: {new Date(timestamp * 1000).toLocaleString()}
                    </p>
                </div>
                <div className={`px-6 py-3 rounded-xl border ${sentiment_score > 0 ? 'border-green-500/30 bg-green-500/10 text-green-400' : sentiment_score < 0 ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-gray-500/30 bg-gray-500/10 text-gray-400'}`}>
                    <span className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                        <i className={sentiment_score > 0 ? "ri-thumb-up-line" : "ri-thumb-down-line"}></i>
                        {t('sentiment')}: {sentiment_score > 0 ? t('positive') : sentiment_score < 0 ? t('negative') : t('neutral')}
                    </span>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="bg-[#15151A] rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-32 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 transition group-hover:bg-purple-600/10 duration-1000"></div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 relative z-10 text-white">
                    <i className="ri-file-list-3-line text-purple-500"></i> {t('executive_summary')}
                </h2>
                <div className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed relative z-10">
                    {summary.split('\n').map((para, i) => <p key={i} className="mb-4">{para}</p>)}
                </div>
            </div>

            {/* Trend Analysis Chart (Full Width - Premium Style) */}
            {report?.data && report?.data.length > 0 && (
                <div className="bg-[#15151A] rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 p-24 opacity-5 pointer-events-none">
                        <i className="ri-brain-line text-9xl text-purple-500 transform rotate-12"></i>
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold mb-4 text-[#22D3EE]">
                            {report.title || t('trend_analysis')}
                        </h2>
                        <p className="text-gray-300 mb-10 max-w-4xl leading-relaxed text-lg">
                            {report.insight || t('trend_insight')}
                        </p>

                        <div className="h-96 w-full mt-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={report.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#22D3EE" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.5} />
                                    <XAxis
                                        dataKey="x"
                                        stroke="#6B7280"
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        axisLine={{ stroke: '#374151' }}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#6B7280"
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(34, 211, 238, 0.05)' }}
                                        contentStyle={{
                                            backgroundColor: '#1F1F23',
                                            border: '1px solid #374151',
                                            borderRadius: '12px',
                                            color: '#fff',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                        }}
                                        itemStyle={{ color: '#22D3EE', fontWeight: 'bold' }}
                                        formatter={(value) => [value, report.yaxis_label || t('count')]}
                                        labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                                    />
                                    <Bar
                                        dataKey="y"
                                        fill="url(#colorGradient)"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={60}
                                        animationDuration={1500}
                                    >
                                        <LabelList dataKey="y" position="top" fill="#22D3EE" fontSize={14} fontWeight="bold" formatter={(value) => value > 0 ? value : ''} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Sentiment Analysis Chart */}
                <div className="bg-[#15151A] rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
                    {/* Background Decoration */}
                    <div className="absolute -bottom-10 -left-10 p-20 opacity-5 pointer-events-none">
                        <i className="ri-donut-chart-line text-8xl text-blue-500 transform -rotate-12"></i>
                    </div>

                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white relative z-10">
                        <i className="ri-pie-chart-2-line text-blue-500"></i> {t('sentiment_distribution')}
                    </h2>
                    <div className="h-64 w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sentimentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sentimentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F1F23', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Key Entities Cloud */}
                <div className="bg-[#15151A] rounded-2xl p-6 border border-white/5 shadow-xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                        <i className="ri-node-tree text-green-500"></i> {t('key_entities_detected')}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {key_entities && key_entities.map((entity, i) => (
                            <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition text-gray-300 rounded-xl text-sm cursor-default">
                                {entity}
                            </span>
                        ))}
                        {!key_entities && <p className="text-gray-500 italic">{t('no_entities')}</p>}
                    </div>
                </div>

                {/* Suggestions Section */}
                {report.suggestions && report.suggestions.length > 0 && (
                    <div className="col-span-1 lg:col-span-2 bg-[#15151A] rounded-2xl p-8 border border-white/5 shadow-xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                            <i className="ri-lightbulb-flash-line text-yellow-500"></i> {t('strategic_suggestions')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {report.suggestions.map((suggestion, i) => (
                                <div key={i} className="bg-black/20 p-5 rounded-xl border border-white/5 hover:border-yellow-500/30 transition flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 text-yellow-500 font-bold border border-yellow-500/20">
                                        {i + 1}
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed">{suggestion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sources List */}
            <div className="bg-[#15151A] rounded-2xl p-8 border border-white/5 shadow-xl">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                    <i className="ri-links-line text-yellow-500"></i> {t('verified_sources')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources && sources.slice(0, 8).map((source, i) => (
                        <a key={i} href={source} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-black/20 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 transition group">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-400 transition">
                                <i className="ri-global-line text-gray-400"></i>
                            </div>
                            <span className="text-sm text-gray-400 group-hover:text-white truncate flex-1">{source}</span>
                            <i className="ri-external-link-line text-gray-600 group-hover:text-purple-400"></i>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

const LiveAnalyticsDashboard = AnalysisDashboard;
export default LiveAnalyticsDashboard;
