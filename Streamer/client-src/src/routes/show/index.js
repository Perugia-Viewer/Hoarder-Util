import { Component } from 'preact';
import axios from 'axios';
import 'preact-material-components/Card/style.css';
import 'preact-material-components/Button/style.css';
import style from './style';
import { SERVER } from '../../helpers/constants';

/**
 * @typedef Episode
 * @property {string} file
 * @property {string} season
 * @property {string} [watched=]
 */
export default class Show extends Component {
    state = {
        episodes: {},
        viewerOpen: false
    };

    componentWillMount () {
        axios.get(`${SERVER}/library/${this.props.show}`).then(res => {
            this.setState({ episodes: this.processSeasons(res.data) });
        }).catch(err => console.log(err));
    }

    /**
     * @param {Episode} data 
     */
    processSeasons (data) {
        return data.reduce((acc, item) => ((acc[item['season']] = [...(acc[item['season']] || []), item]), acc), {});
    }

    launchViewer = () => {

    }

    render({ show }) {
        const { episodes } = this.state;
        return (
            <div class={`${style.home} page`}>
                <header class={style.headerTitle}>
                    <img src={`${SERVER}/thumb/${show}`} class={style.showImage} />
                    <h1 class={style.titleText}>{show}</h1>
                </header>
                <section class={style.episodeList}>
                    {Object.keys(episodes).map(seasonSet => (
                        <div class={style.seasonSet}>
                        {(seasonSet !== show) && <h2>{seasonSet}</h2>}
                            {episodes[seasonSet].map(episode => (
                                <div class={style.episode}>
                                    {episode.file}
                                </div>
                            ))}
                        </div>
                    ))}
                </section>
            </div>
        );
    }
}