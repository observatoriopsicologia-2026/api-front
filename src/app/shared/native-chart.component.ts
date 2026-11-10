import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { BarController, BarElement, CategoryScale, Chart, ChartData, ChartOptions, Legend, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);
export type BarData = ChartData<'bar', number[], string>;
export const chartColors = ['#1276b8', '#ef633f', '#119387', '#d4a318', '#8c4c90', '#657480'];

export function barOptions(horizontal: boolean, stacked: boolean): ChartOptions<'bar'> {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 13 } } } },
    scales: {
      x: { stacked, beginAtZero: true, ticks: { font: { size: 12 }, ...(horizontal ? { precision: 0 } : {}) } },
      y: { stacked, beginAtZero: true, ticks: { font: { size: 12 }, ...(!horizontal ? { precision: 0 } : {}) } }
    }
  };
}

@Component({
  selector: 'app-native-chart', standalone: true,
  template: '<div class="canvas-wrap"><canvas #canvas role="img" [attr.aria-label]="title">{{ title }}</canvas></div>',
  styles: [':host { display: block; min-width: 0; } .canvas-wrap { position: relative; height: 360px; width: 100%; } @media(max-width: 600px) { .canvas-wrap { height: 350px; } }']
})
export class NativeChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  @Input() data: BarData = { labels: [], datasets: [] };
  @Input() title = '';
  @Input() horizontal = false;
  @Input() stacked = false;
  @Output() categorySelected = new EventEmitter<string>();
  private chart?: Chart<'bar', number[], string>;

  ngAfterViewInit() {
    this.chart = new Chart(this.canvas.nativeElement, { type: 'bar', data: this.data, options: this.options() });
  }
  ngOnChanges() {
    if (!this.chart) return;
    this.chart.data = this.data;
    this.chart.options = this.options();
    this.chart.update();
  }
  ngOnDestroy() { this.chart?.destroy(); }
  private options(): ChartOptions<'bar'> {
    return {
      ...barOptions(this.horizontal, this.stacked),
      onClick: (_event, elements) => {
        if (elements.length) this.categorySelected.emit(this.data.labels![elements[0].index]);
      }
    };
  }
}
