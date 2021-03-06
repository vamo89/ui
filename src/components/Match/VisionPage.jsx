import React from 'react';
import {
  Row,
  Col,
} from 'react-flexbox-grid';
import { formatSeconds, getTeamName } from 'utility';
import Paper from 'material-ui/Paper';
import Slider from 'material-ui/Slider';
import _ from 'lodash/fp';

import VisionMap from './VisionMap' ;
import WardLog from './WardLog';
import PlayerFilter from './Vision/PlayerFilter';
import styles from './Match.css';

const SliderTicks = props => (
  <div {...props}>
    {props.ticks.map((tick) => {
      const [t, min, max] = [tick, props.min, props.max];
      const percent = 100 * ((t - min) / (max - min));
      const cls = [styles.sliderTick];
      if (tick <= props.value) { cls.push(styles.active); }

      return (
        <a key={tick} onClick={() => props.onTickClick(tick)} className={cls.join(' ')} style={{ left: `${percent}%` }}>
          {formatSeconds(tick)}
        </a>
      );
    })}
  </div>
);

// remove this component
const PlayersFilter = ({ activeFilters, players, onFilterClick }) => (
  <Paper>
    {players.map((p, index) => <PlayerFilter key={index} player={p} activeFilters={activeFilters} onFilterClick={onFilterClick} />)}
  </Paper>
);

const pipelineFilter = (filters, data) => {
  const filtered = filters.map(f => data.filter(f))
                          .reduce((o, v) => o.concat(v), []);
  return _.differenceWith((x, y) => x === y, data, filtered);
};

const FixedPlayersFilter = PlayersFilter;

class VisionPage extends React.Component {
  static hideWardLog(playerSlot, type) {
    return l => l.entered.player_slot === playerSlot && l.type === type;
  }

  constructor(props) {
    super(props);
    this.state = {
      currentTick: -90,
      min: -90,
      max: props.match.duration,
      from: 0,
      to: this.props.match.wards_log.length,
      wardsLog: props.match.wards_log,
      filters: {},
    };

    this.ticks = this.computeTick();
    this.findPivot = value => _.flow(_.map(x => x.entered.time),
                                     _.sortedIndex(value))(this.state.wardsLog);
    this.handleViewportChange = _.debounce(50, this.viewportChange);
  }

  computeTick() {
    const interval = 10 * 60; // every 10 minutes interval
    return _.rangeStep(interval, 0, this.props.match.duration);
  }

  viewportChange(value) {
    this.setState({ currentTick: value, from: this.findPivot(value) });
  }

  visibleData() {
    return pipelineFilter(_.values(this.state.filters),
                          this.state.wardsLog.slice(this.state.from));
  }

  togglePlayerFilter(name, filter) {
    if (name in this.state.filters) {
      const oldFilters = Object.assign({}, this.state.filters);
      delete oldFilters[name];
      this.setState({ filters: oldFilters });
    } else {
      const newFilter = {};
      newFilter[name] = filter;
      this.setState({ filters: Object.assign({}, this.state.filters, newFilter) });
    }
  }

  render() {
    const visibleWards = this.visibleData();
    const playerFilterClick = (filterKey, playerSlot, type) => this.togglePlayerFilter(filterKey, VisionPage.hideWardLog(playerSlot, type));
    return (
      <div>
        <Row center="md">
          <Col xs={12} md={4}>
            <VisionMap wardsLog={visibleWards} />
          </Col>
          <Col xs={12} md={8}>
            <Row>
              <Col xs={12} md={6} lg={12} className={styles.wardLogPlayerFilter}>
                <Col xs className={styles.filterHeader}>
                  {getTeamName(this.props.match.radiant_team, true)}
                </Col>
                {<FixedPlayersFilter
                  activeFilters={this.state.filters}
                  onFilterClick={playerFilterClick}
                  players={this.props.match.players.slice(0, 5)}
                />
                }
              </Col>
              <Col xs={12} md={6} lg={12} className={styles.wardLogPlayerFilter}>
                <Col xs className={styles.filterHeader}>
                  {getTeamName(this.props.match.dire_team, false)}
                </Col>
                {<FixedPlayersFilter
                  activeFilters={this.state.filters}
                  onFilterClick={playerFilterClick}
                  players={this.props.match.players.slice(5)}
                />
                }
              </Col>
            </Row>
          </Col>
        </Row>
        <Row>
          <Col xs>
            <SliderTicks
              value={this.state.currentTick}
              min={this.state.min}
              max={this.state.max}
              className={styles.sliderTicks}
              onTickClick={tick => this.handleViewportChange(tick)}
              ticks={this.ticks}
            />
            <Slider
              min={this.state.min}
              max={this.state.max}
              value={this.state.currentTick}
              step={5}
              disableFocusRipple
              onChange={(e, value) => this.handleViewportChange(value)}
            />
          </Col>
        </Row>
        <WardLog
          match={this.props.match}
          wardsLog={visibleWards}
        />
      </div>
    );
  }
}

export default VisionPage;
