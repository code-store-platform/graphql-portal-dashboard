import React from 'react';
import { Helmet } from 'react-helmet';

import { useDashboardMetrics } from '../../presenter/Metrics';
import {
  Header,
  HugeWidget,
  WidgetRow,
  Select,
  ButtonGroup,
  Widget,
  WidgetHeader,
} from '../../ui';
import {
  CHART_BUTTONS,
  CountryChart,
  LatencyRequestChart,
  SuccessFailureChart,
} from '../MetricChart';
import { useStyles } from './useStyles';

export const Dashboard: React.FC = () => {
  const { widget, apiSelect, apiSelectLabel } = useStyles();
  const {
    data,
    range,
    onSetRange,
    apiDef,
    apis,
    onSelectChange,
  } = useDashboardMetrics();

  return (
    <>
      <Helmet>
        <title>Dashboard</title>
      </Helmet>
      <Header title="Dashboard" />
      <WidgetRow>
        <Widget className={widget}>
          <ButtonGroup onClick={onSetRange} buttons={CHART_BUTTONS} />
        </Widget>
        <Widget className={widget}>
          <Select
            labelClassName={apiSelectLabel}
            className={apiSelect}
            options={apis}
            value={apiDef}
            label="Filter by API"
            onChange={onSelectChange}
            fullWidth
          />
        </Widget>
      </WidgetRow>
      <WidgetRow>
        <HugeWidget>
          <WidgetHeader title="Latency and Request" />
          <LatencyRequestChart
            data={data?.getChunkedAPIMetrics || []}
            range={range}
          />
        </HugeWidget>
      </WidgetRow>
      <WidgetRow>
        <HugeWidget>
          <WidgetHeader title="Success and Failure" />
          <SuccessFailureChart
            data={data?.getChunkedAPIMetrics || []}
            range={range}
          />
        </HugeWidget>
      </WidgetRow>
      <WidgetRow>
        <HugeWidget>
          <WidgetHeader title="Countries" />
          <CountryChart data={data?.getCountryMetrics || []} />
        </HugeWidget>
      </WidgetRow>
    </>
  );
};
