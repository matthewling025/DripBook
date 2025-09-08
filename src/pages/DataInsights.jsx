
import React, { useState, useEffect, useCallback } from "react";
import { Bean, BrewSession } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Coffee,
  Star,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Award,
  Calendar
} from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";

export default function DataInsights() {
  const [sessions, setSessions] = useState([]);
  const [beans, setBeans] = useState([]);
  const [timeRange, setTimeRange] = useState("30"); // days
  const [insights, setInsights] = useState({});

  const calculateInsights = useCallback((sessions, beans) => {
    if (sessions.length === 0) {
      setInsights({});
      return;
    }

    // Average ratings over time
    const ratingsByDate = sessions.reduce((acc, session) => {
      const date = format(new Date(session.created_date), 'MMM dd');
      if (!acc[date]) acc[date] = [];
      if (session.rating) acc[date].push(session.rating);
      return acc;
    }, {});

    const ratingTrends = Object.entries(ratingsByDate).map(([date, ratings]) => ({
      date,
      avgRating: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
      sessions: ratings.length
    })).slice(-14); // Last 14 data points

    // Method distribution
    const methodCounts = sessions.reduce((acc, session) => {
      acc[session.method] = (acc[session.method] || 0) + 1;
      return acc;
    }, {});

    const methodDistribution = Object.entries(methodCounts).map(([method, count]) => ({
      method: method.replace('_', ' ').toUpperCase(),
      count,
      percentage: Math.round((count / sessions.length) * 100)
    }));

    // TDS distribution
    const tdsData = sessions
      .filter(s => s.tds)
      .map(s => parseFloat(s.tds))
      .sort((a, b) => a - b);

    const tdsRanges = {
      'Under-extracted (< 1.15%)': tdsData.filter(tds => tds < 1.15).length,
      'Sweet Spot (1.15-1.35%)': tdsData.filter(tds => tds >= 1.15 && tds <= 1.35).length,
      'Over-extracted (> 1.35%)': tdsData.filter(tds => tds > 1.35).length
    };

    const tdsDistribution = Object.entries(tdsRanges).map(([range, count]) => ({
      range,
      count,
      percentage: tdsData.length > 0 ? Math.round((count / tdsData.length) * 100) : 0
    }));

    // Bean usage
    const beanUsage = sessions.reduce((acc, session) => {
      const bean = beans.find(b => b.id === session.bean_id);
      if (bean) {
        const key = `${bean.name} - ${bean.origin}`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {});

    const topBeans = Object.entries(beanUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([bean, count]) => ({ bean, count }));

    // Key stats
    const avgTDS = tdsData.length > 0 ? (tdsData.reduce((sum, tds) => sum + tds, 0) / tdsData.length).toFixed(2) : 0;
    const avgRating = sessions.filter(s => s.rating).reduce((sum, s) => sum + s.rating, 0) / sessions.filter(s => s.rating).length || 0;
    const totalSessions = sessions.length;
    let favMethod = 'None';
    if (methodDistribution.length > 0) {
      favMethod = methodDistribution.sort((a,b) => b.count - a.count)[0].method;
    }

    setInsights({
      ratingTrends,
      methodDistribution,
      tdsDistribution,
      topBeans,
      avgTDS,
      avgRating: avgRating.toFixed(1),
      totalSessions,
      favMethod
    });
  }, []); // calculateInsights depends only on its arguments, not on component state/props directly, so empty deps array

  const loadData = useCallback(async () => {
    const [allSessions, allBeans] = await Promise.all([
      BrewSession.list('-created_date'),
      Bean.list()
    ]);

    // Filter sessions based on time range
    const cutoffDate = subDays(new Date(), parseInt(timeRange));
    const filteredSessions = allSessions.filter(session => 
      new Date(session.created_date) > cutoffDate
    );

    setSessions(filteredSessions);
    setBeans(allBeans);
    // calculateInsights is now memoized, so passing it as a dependency is fine.
    calculateInsights(filteredSessions, allBeans); 
  }, [timeRange, calculateInsights]); // Dependency: timeRange and calculateInsights (which is stable)

  useEffect(() => {
    loadData();
  }, [loadData]); // Dependency: loadData, which is memoized by useCallback.

  const COLORS = ['#D97706', '#92400E', '#451A03', '#EA580C', '#DC2626', '#7C2D12'];

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Brew Insights</h1>
            <p className="text-muted-foreground mt-1">Analyze your brewing patterns and improve your coffee.</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sessions.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">No Data Available</h3>
              <p className="text-muted-foreground">Start brewing to see your insights!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-6 text-center">
                  <Coffee className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{insights.totalSessions}</p>
                  <p className="text-sm text-muted-foreground">Total Brews</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6 text-center">
                  <Star className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{insights.avgRating}</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{insights.avgTDS}%</p>
                  <p className="text-sm text-muted-foreground">Avg TDS</p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6 text-center">
                  <Award className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-xl font-bold text-foreground">{insights.favMethod}</p>
                  <p className="text-sm text-muted-foreground">Favorite Method</p>
                </CardContent>
              </Card>
            </div>

            {/* Rating Trends */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Rating Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={insights.ratingTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[1, 5]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="avgRating" 
                      stroke="#D97706" 
                      strokeWidth={3}
                      dot={{ fill: '#D97706', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Method Distribution */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-primary" />
                    Brewing Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={insights.methodDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ method, percentage }) => `${method} (${percentage}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {insights.methodDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* TDS Distribution */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Extraction Quality
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {insights.tdsDistribution?.map((item, index) => (
                    <div key={item.range} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{item.range}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              index === 1 ? 'bg-green-500' : index === 0 ? 'bg-blue-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground w-10 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Top Beans */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-primary" />
                  Most Used Beans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.topBeans?.map((item, index) => (
                    <div key={item.bean} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-primary font-bold">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium text-foreground">{item.bean}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.count} brews</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
