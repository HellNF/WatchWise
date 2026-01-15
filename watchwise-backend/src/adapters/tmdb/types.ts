export interface TMDBMovie {
  id: number;
  title: string;
  release_date?: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  poster_path?: string; 
}


export interface TMDBMovieListResponse {
  page: number;
  results: TMDBMovie[];
}

export interface TMDBDiscoverResponse {
  page: number;
  results: TMDBMovie[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBGenreListResponse {
  genres: TMDBGenre[];
}
export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path?: string;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  profile_path?: string;
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  poster_path?: string;
  vote_average?: number;
  overview?: string;
  runtime?: number;
  release_date?: string;
  genres?: { id: number; name: string }[];
  credits: TMDBCredits;
}

export interface TMDBImageAsset {
  file_path: string;
  width: number;
  height: number;
}

export interface TMDBMovieImagesResponse {
  id: number;
  backdrops: TMDBImageAsset[];
  posters: TMDBImageAsset[];
  logos: TMDBImageAsset[];
}

export interface TMDBVideoAsset {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface TMDBMovieVideosResponse {
  id: number;
  results: TMDBVideoAsset[];
}

export interface TMDBCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}
// Watch providers
export interface TMDBWatchProvider {
  provider_name: string;
}

export interface TMDBWatchProvidersResponse {
  results: {
    [region: string]: {
      flatrate?: TMDBWatchProvider[];
      rent?: TMDBWatchProvider[];
      buy?: TMDBWatchProvider[];
    };
  };
}

export interface TMDBPersonCastMovie extends TMDBMovie {
  character?: string;
  order?: number;
}

export interface TMDBPersonCrewMovie extends TMDBMovie {
  job?: string;
  department?: string;
}

export interface TMDBPersonMovieCreditsResponse {
  cast: TMDBPersonCastMovie[];
  crew: TMDBPersonCrewMovie[];
}

export interface TMDBPersonSearchResult {
  id: number;
  name: string;
  known_for_department?: string;
  profile_path?: string;
}

export interface TMDBPersonSearchResponse {
  page: number;
  results: TMDBPersonSearchResult[];
}



