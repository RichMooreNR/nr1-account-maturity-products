import React from 'react';
import PropTypes from 'prop-types';

import {
  createProgramTableData,
  computeProgramMaturityScore
} from './process-program-score';
import { ProgramTable, ProgramSummaryCols } from './ProgramTable';
import {
  ApplicationCtxConsumer,
  CustomCircleLoader,
  MaturityScoreCtxConsumer
} from '../../contexts/';
import { FilterTableData } from '../../utils/FilterTableData';
import { ProgramModel } from './fetch-program-data';

export const ProgramPanel = () => (
  <ApplicationCtxConsumer>
    {appContext => {
      if (appContext.loading) {
        return <CustomCircleLoader message="Fetching accounts" />;
      }
      return (
        <MaturityScoreCtxConsumer>
          {scoreContext => {
            return (
              <ProgramPanelTag
                appContext={appContext}
                maturityCtxUpdateScore={scoreContext.updateScore}
              />
            );
          }}
        </MaturityScoreCtxConsumer>
      );
    }}
  </ApplicationCtxConsumer>
);

export class ProgramPanelTag extends React.Component {
  static propTypes = {
    appContext: PropTypes.object,
    maturityCtxUpdateScore: PropTypes.func,
    fetchData: PropTypes.func,
    scoreWeights: PropTypes.object,
    tableColHeader: PropTypes.array,
    createTableData: PropTypes.func,
    computeMaturityScore: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      table: []
    };
    const { appContext } = this.props;
    this.nerdGraphQuery = appContext.nerdGraphQuery;
    this.ctxAcctMap = new Map(appContext.accountMap);
    this.docEventTypes = appContext.docEventTypes;
    this.maturityCtxUpdateScore = this.props.maturityCtxUpdateScore;
    this.addMaturityScoreToTable = this.addMaturityScoreToTable.bind(this);

    this.fetchData =
      this.props.fetchData ||
      function() {
        return Promise.resolve(true);
      };

    this.createTableData = this.props.createTableData || createProgramTableData;
    this.computeMaturityScore =
      this.props.computeMaturityScore || computeProgramMaturityScore;

    this.scoreWeights = this.props.scoreWeights || ProgramModel.scoreWeights;
    this.tableColHeader = this.props.tableColHeader || ProgramSummaryCols;
  }

  async componentDidMount() {
    await this.fetchData(this.ctxAcctMap, this.nerdGraphQuery);
    const tableData = this.createTableData(this.ctxAcctMap);
    const scores = this.addMaturityScoreToTable(tableData);

    this.setState({
      loading: false,
      table: tableData
    });

    this.maturityCtxUpdateScore('PROGRAMMABILITY', scores, tableData);
  }

  addMaturityScoreToTable(tableData) {
    const maturityScores = {};

    tableData.forEach(row => {
      const { score } = this.computeMaturityScore({
        rowData: row,
        scoreWeights: this.scoreWeights
      });

      const { accountID, accountName } = row;
      row.overallScore = score;

      maturityScores[accountID] = { accountID, accountName, SCORE: score };
    });

    return maturityScores;
  }

  render() {
    if (this.state.loading) {
      return <CustomCircleLoader message="Loading Programability Data" />;
    }

    return (
      <FilterTableData
        tableData={this.state.table}
        filterKeys={['overallScore']}
      >
        {({ filteredData }) => (
          <ProgramTable data={filteredData} columns={this.tableColHeader} />
        )}
      </FilterTableData>
    );
  }
}
