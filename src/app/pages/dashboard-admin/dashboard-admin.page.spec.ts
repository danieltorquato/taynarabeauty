import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardAdminPage } from './dashboard-admin.page';

describe('DashboardAdminPage', () => {
  let component: DashboardAdminPage;
  let fixture: ComponentFixture<DashboardAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
