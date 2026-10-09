export type ResearchTopic = 'Visual Neuroscience' | 'Protein Modelling' | 'Industrial Sensing';

export interface FeaturedResearch {
  id: string;
  title: string;
  paperTitle: string;
  tags: ResearchTopic[];
  summary: string;
  venue: string;
  year: number;
  authors: string[];
  url: string;
  paperUrl: string;
  codeUrl: string;
  image: string;
  imageAlt: string;
}

export interface OtherResearch {
  id: string;
  title: string;
  paperTitle: string;
  tags: ResearchTopic[];
  venue: string;
  year: number;
  url: string;
  summary: string;
}

export interface Profile {
  name: string;
  role: string;
  bio: string;
  bioParagraphs: string[];
  skills: string[];
  links: { label: string; href: string }[];
  featuredResearch: FeaturedResearch[];
  otherResearch: OtherResearch[];
  highlights: { id: string; year: number; text: string; url: string }[];
}

const bioParagraphs = [
  'My interests lie in machine learning, computer vision, and neuroscience.',
  'I also enjoy building LLM agents to make everyday tasks easier.',
];

export const profile: Profile = {
  name: 'Rining Wu',
  role: 'PhD Researcher',
  bio: bioParagraphs.join(' '),
  bioParagraphs,
  skills: ['Machine learning', 'Python', 'Computer vision', 'Data analysis'],
  links: [
    { label: 'Google Scholar', href: 'https://scholar.google.com/citations?user=wPAdqNwAAAAJ' },
    { label: 'ORCID', href: 'https://orcid.org/0000-0002-8834-9316' },
    { label: 'GitHub', href: 'https://github.com/wurining' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/rining-wu' },
  ],
  featuredResearch: [
    {
      id: 'vi-st',
      title: 'Predicting how neurons respond to video',
      paperTitle: 'Aligning Neuronal Coding of Dynamic Visual Scenes with Foundation Vision Models',
      tags: ['Visual Neuroscience'],
      summary: 'Vi-ST combines a pretrained vision model with temporal processing to predict how retinal neurons respond to natural video. The study examines how visual changes over time relate to neural activity.',
      venue: 'ECCV',
      year: 2024,
      authors: ['Rining Wu', 'Feixiang Zhou', 'Ziwei Yin', 'Jian K. Liu'],
      url: '/publications/aligning-neuronal-coding-of-dynamic-visual-scenes-with-foundation-vision-models/',
      paperUrl: 'https://doi.org/10.1007/978-3-031-73223-2_14',
      codeUrl: 'https://github.com/wurining/Vi-ST',
      image: '/publications/aligning-neuronal-coding-of-dynamic-visual-scenes-with-foundation-vision-models/model_fig.jpg',
      imageAlt: 'Architecture diagram for the Vi-ST neural response prediction model.',
    },
  ],
  otherResearch: [
    {
      id: 'hybridgcn',
      title: 'Predicting protein solubility',
      paperTitle: 'HybridGCN for protein solubility prediction with adaptive weighting of multiple features',
      tags: ['Protein Modelling'],
      venue: 'Journal of Cheminformatics',
      year: 2023,
      url: 'https://doi.org/10.1186/s13321-023-00788-8',
      summary: 'Combining protein language-model features and biophysical features to predict protein solubility.',
    },
    {
      id: 'gas-water-sensors',
      title: 'Deep learning for industrial sensor data',
      paperTitle: 'Enhancing Accuracy in Gas–Water Two-Phase Flow Sensor Systems Through Deep-Learning-Based Computational Framework',
      tags: ['Industrial Sensing'],
      venue: 'IEEE Sensors Journal',
      year: 2024,
      url: 'https://doi.org/10.1109/JSEN.2024.3475292',
      summary: 'Using multiple sensors and deep learning to estimate gas and water flow rates in a pipeline.',
    },
    {
      id: 'gas-water-time-series',
      title: 'Modelling flow from sensor time series',
      paperTitle: 'Harnessing Multiple Time-Series Sensor Data: Evaluating the Efficacy of Various Machine Learning Models in Predicting Gas-Water Two-Phase Flow',
      tags: ['Industrial Sensing'],
      venue: 'TFEC',
      year: 2024,
      url: 'https://doi.org/10.1615/tfec2024.ml.050649',
      summary: 'Comparing machine learning models for gas–water flow prediction from time-series sensor data.',
    },
  ],
  highlights: [
    {
      id: 'closed-loop-hackathon',
      year: 2025,
      text: 'Team first prize — Closed Loop Neurotechnology Hackathon, Imperial College London.',
      url: 'https://www.imperial.ac.uk/dementia-research-institute/events/closed-loop-neurotechnology-hackathon/',
    },
    {
      id: 'hcv-poster',
      year: 2024,
      text: 'Extended abstract accepted for a poster — Human-inspired Computer Vision Workshop, ECCV.',
      url: 'https://sites.google.com/view/hcvworkshop2024/accepted-papers',
    },
  ],
};
